---
status: draft
status_description: "Leftovers pass of the closing sweep 2026-09-28 at 4278ce0, on Opus (not a review): AC10's review list of upstream-adapters' credential kinds names the Conan-shaped basic-exchange (upstream-adapters was-Q8, AC33); the replay's no-principal property and AC36's row cite async-operations AC30. AC10 unchanged in force. 36 criteria, zero open questions, no new question. Earlier, second closing-sweep pass 2026-09-28 at 1d6b1c8, on Opus (not a review): the revalidation replay entry (proxy-cache was-Q18, AC26; format-handler-interface was-Q11, AC18) is named in Authorization is central as the one handler entry that skips the authorizer, with the three properties that make it safe (no principal or credential, nothing returned to any caller, one asserted call site on a fixed GET-on-a-remote input), the conditions that would make it unsafe, and its enforcers adopted beside internal/auth/arch_test.go (AC36); it is ADDED to AC10's external review list, whose scope now names every authorizer-bypassing entry and reviews a surface landing after the first review before it reaches main. AC10 unchanged in force. 36 criteria, zero open questions, no new question. Earlier, reconciled 2026-09-28 at 173da1b in the closing sweep of step 3, on Opus (not a review): the client table gained seventeen rows from the format batches, each checked against its format spec's own capture (go, apt, dput, conan, apk, pacman, mix/rebar3, cpanm, cpm/carton, CPAN.pm, cpan-upload, julia Pkg, SwiftPM, dart pub, vagrant, opam, brew), and the helm row was corrected from its captures (Basic only, preemptive, scheme-and-host confined; Bearer only from cm-push); the Bearer, Basic and scheme-less rows name every client that needs them; the uniform challenge names Swift, pub and Vagrant as declaring Bearer; Pattern scopes gained OCI's {image}/{tag} object and repository-less GET /v2/ descriptor authorized by authentication alone (AC32 extended), Galaxy discovery as a descriptor, and the descriptor and enumerating-none examples from the format specs. Q25 raised and adopted under the standing delegation: Conan's token-exchange echo is written by the shared layer on a declared route, never by the handler (AC35). No new presentation form; AC10 untouched, its review list extended. 35 criteria, zero open questions; stays draft pending a gate review and a Fable recheck of Q25. Earlier, 2026-09-28 at 95346bd: GET /api/v1/session answers an anonymous caller 200 (AC22). Earlier, 2026-09-27 at a72f8ef: fourteen client rows, the presentation-form table, Q24, AC33 and AC34. AC10 still requires external review of the implementation regardless of spec status."
description: "Spec for the two auth surfaces a registry needs: human identity via a standard OIDC client with a local-admin fallback, and machine identity via scoped registry tokens that package clients can actually present."
author: michielvha
goal: "Give every format one auth model that real package clients can use, while keeping user passwords, MFA, account recovery and federation outside our code."
priority: "critical"
issue: 13
fable_recheck: "closing reconciliation sweep on Opus 2026-09-28 raised and adopted Q25 (the shared layer writes Conan's token-exchange echo on a declared route, AC35) and added the repository-less descriptor rule for OCI's GET /v2/ (AC32); both need a Fable recheck. Second closing pass on Opus 2026-09-28 added AC36, bounding the revalidation replay that skips the authorizer (GET on a remote only, six unsafe conditions) and adding it to AC10 review surface: a security judgement, never Fable-reviewed"
created: 2026-09-22
covers:
  - "internal/auth/**"
---

# Plan: Authentication and authorization

Two surfaces that are not the same problem, and only one of them can be outsourced.

## Context

This spec exists because the adversarial review pass found it missing. Three specs already
depend on an auth foundation that no document owned: `generic.md` states its job is proving auth
end to end (its AC2 presumes a repository visibility model nothing defines), `oci.md` requires a
token service it explicitly declines to spec, and `format-handler-interface.md` names auth as a
shared concern handlers must not implement.

### Why this cannot be fully outsourced to an identity provider

**Package clients cannot do OIDC.** There is no browser, no redirect, no PKCE in `docker login`,
`npm`, `pip`, `mvn`, `ansible-galaxy` or `cargo`. They present:

| Client | What it sends |
|---|---|
| `docker` / `podman` | The OCI token flow: a `WWW-Authenticate` challenge, then a bearer token from a token endpoint, scoped per repository and action. At the token endpoint the client presents the registry token as the Basic password (`docker login --password-stdin`); the username is not an authentication input, and the endpoint issues no refresh token, so a revoked registry token's reach ends with the already-issued access token's lifetime inside AC5's window (`formats/oci.md`, the resolved docker-login-credential decision) |
| `npm` | `Authorization: Bearer <token>` from `.npmrc` |
| `pip` / `twine` | HTTP Basic, conventionally username `__token__` with the token as password |
| `mvn` | HTTP Basic from `settings.xml`, in two modes: every read goes out anonymous and is retried with Basic after a `401` carrying `WWW-Authenticate: Basic`; every `PUT` carries Basic **preemptively**, before any challenge. Maven and Gradle print only the status line on a refusal (captured 2026-09-26 from Maven 3.8.8 and 3.9.11; `formats/maven.md`, "Authentication: Basic after a challenge, preemptive on PUT") |
| `gradle` / `sbt` / `lein` | HTTP Basic, the same two modes as `mvn`: challenged on reads, preemptive on `PUT`, and preemptive on reads too when Gradle is given an explicit `BasicAuthentication` scheme. The credential comes from `credentials {}` (Gradle), `Credentials(...)` (sbt, through Coursier) and the `settings.xml` server password Leiningen reads through `:repositories` (captured 2026-09-26 from Gradle 8.14.5 and 9.1.0, sbt 1.13.0 and Leiningen 2.13.0; `formats/maven.md`) |
| `dotnet` (NuGet) | Two forms. `X-NuGet-ApiKey: <token>` on the `PackagePublish` routes only, and only when `--api-key` was given (no header at all otherwise). Every route, publish included, goes out anonymous first and is retried with `Authorization: Basic` (token as the password, username not an input) after a `401` carrying `WWW-Authenticate: Basic`; a challenged push therefore arrives a second time carrying **both** headers, and a rejected retry is repeated a dozen times before `NU1301` (captured 2026-09-26 from NuGet 6.3.4 and 6.14.3; `formats/nuget.md`, "Authentication: an API key header, and Basic after a challenge") |
| `helm` | Classic repositories: HTTP Basic only, from `helm repo add --username --password`, sent **preemptively** on the index, chart and provenance fetches and **only to the repository's own scheme and host**: a chart URL on a second host receives no `Authorization` unless the repository was added with `--pass-credentials` (`passCredentialsAll \|\| (same scheme && same host)` in `httpgetter.go`). `helm repo add` has no bearer option; Bearer reaches the classic path only from the `cm-push` plugin's `--access-token`. `helm registry login` on the OCI path is the `docker` flow above (captured from Helm 3.20.0, 3.22.0 and 4.3.0 and `helm cm-push` 0.11.1; `formats/helm.md`, "The wire surface" and "Conformance, auth and the corpus") |
| `ansible-galaxy` | `Authorization: Token <token>` on every request, including discovery; `Bearer` only under the separate Keycloak `auth_url` flow, Basic only with a configured username/password (captured 2026-09-25 from ansible-core 2.18.18rc1; see `formats/ansible-collections.md`, "The wire contract") |
| `cargo` | The bare token string as the whole `Authorization` value, with no scheme. Sent on every authenticated web API request (publish, yank, unyank, owners). Sent on index and download requests only after the registry has signalled `auth-required`: a credential-less `config.json` fetch answered 401 with the challenge `WWW-Authenticate: Cargo login_url="<url>"`, then a retried fetch returning `auth-required: true`; only cargo 1.74 and later perform that retry. **Never sent on search**, even with a token configured, so search cannot authenticate (captured 2026-09-26 from cargo 1.70.0 and 1.98.1 against a logging stub; see `formats/cargo.md`, "Authentication: a bare token, and the challenge that unlocks it") |
| `composer` | `Authorization: Basic` (token as the password) from `http-basic`, or `Authorization: Bearer` from `bearer`, in `auth.json` or `COMPOSER_AUTH`, sent **preemptively on every request** to the origin. The credential is keyed by origin **including the port**: a credential keyed by the bare host is silently not sent to a port-qualified origin. Non-interactively there is no challenge handling; a `401` ends the run (captured 2026-09-26 from Composer 2.10.3 and 2.2.30; `formats/composer.md`, "Authentication: preemptive Basic or Bearer, keyed by origin with its port") |
| `conda` / `mamba` / `micromamba` / `pixi` | Four forms, none of them answering a challenge: Basic from URL userinfo (token as the password) on every request (mamba 2.9.0 dropped it on the package request, a recorded client defect); Basic from a stored login (`mamba auth login` and `micromamba auth login`, keyed on `host:port`; `pixi auth login --username`, keyed on the host); `Authorization: Bearer` from `mamba auth login --bearer` (also micromamba) and `pixi auth login --token`; and the **path token**, the anaconda.org convention `/t/{token}/` inserted between the host and the channel path on every request, from `mamba auth login --token`, `micromamba auth login --token`, `pixi auth login --conda-token` or a channel URL written in that form, the only non-Basic form `conda` supports without a plugin (captured 2026-09-26 from conda 26.7.1 and 24.1.2, mamba 2.9.0, micromamba 2.3.3 and pixi 0.81.0; `formats/conda.md`, "Authentication") |
| `rattler-build` | Basic (token as the password) under `upload artifactory`, Bearer under `upload prefix` (captured 2026-09-26 from rattler-build 0.76.1; `formats/conda.md`) |
| `R` / `renv` / `pak` | HTTP Basic carried in the repository URL's userinfo, `https://__token__:{token}@host/...`, the one form all three share: base R and renv send it preemptively on every index and tarball request; pak sends the first request bare, takes the `401`, and retries with Basic, so the challenge must carry `WWW-Authenticate: Basic`. None reacts to any other challenge, and a wrong credential renders exactly as a missing index (captured 2026-09-26; `formats/cran.md`, "Authentication: URL userinfo, and clients that never see a challenge") |
| `terraform` / `tofu` | `Authorization: Bearer` from the CLI configuration's `credentials` block or `TF_TOKEN_<host>` on discovery and every registry-protocol route, and **no credential at all on any byte URL** (module archives, `SHA256SUMS`, its signature, provider zips, mirror archives), on the same host or another. Private bytes are therefore fetched through the **download capability** in the URL path, minted by this spec's token service (Design, "The token service's two ephemeral products"). Both clients follow a redirect with the Bearer credential and then fail (captured 2026-09-26 from Terraform 1.5.7 and 1.16.4 and OpenTofu 1.6.3 and 1.12.6; `formats/terraform.md`) |
| `dnf` / `dnf5` / `zypper` | HTTP Basic from `username` and `password` or URL userinfo. dnf 4 and dnf5 send it **preemptively on every request**; dnf5 sends **no credential** to a `gpgkey` URL and ignores `sslcacert` for it; zypper sends it **only after a `401` carrying `WWW-Authenticate: Basic realm="..."`**, on every request, so the challenge is mandatory. dnf 4 follows an `xml:base` to another host carrying the repository's credential, over plain HTTP if the metadata says so, which is why hosted trees never emit `xml:base` (captured 2026-09-26 from dnf5 5.4.3, dnf 4.7, 4.14 and 4.20, and zypper 1.14.94 and 1.14.101; `formats/rpm.md`, "Authentication: Basic, preemptive on dnf, challenged on zypper") |
| `knife` (Chef) | Writes (`share`, `unshare`) are **RSA-signed requests**, not token-bearing: mixlib-authentication protocol 1.0 on share and 1.1 on unshare, the signature over a canonical string split across `X-Ops-Authorization-1..N`, with `X-Ops-Userid` (the key name), `X-Ops-Timestamp`, `X-Ops-Content-Hash` (the SHA-1 of the tarball part, not of the whole body) and `X-Ops-Sign`. There is no field a token could travel in. Reads with `-m https://u:{token}@host/...` send Basic on the cookbook and version documents, and the download URL goes out bare (captured 2026-09-26 from knife 19.3.2 and 17.10.0; `formats/chef.md`, "Writes: Chef's signed-header requests against registered public keys") |
| `berks` / `chef-cli` (Chef) | With a `supermarket` source and userinfo, Basic on the universe **only**; every version document and download goes out bare. With the `artifactory` source type and `ARTIFACTORY_API_KEY`, `X-Jfrog-Art-Api: <token>` on the universe, every version document and every download, including a followed redirect, the only form these clients send to every URL (captured 2026-09-26 from Berkshelf 8.1.23 and 8.0.5 and chef-cli 6.1.39 and 5.6.9; `formats/chef.md`, "Reads: a registry token in X-Jfrog-Art-Api, or as Basic") |
| `puppet` / `r10k` | Preemptive on every request, files included, and never a response to a challenge. The module tool sends `forge_authorization` **verbatim** as the `Authorization` value (so `Bearer {token}` is the form to configure) and userinfo as Basic when it is unset; r10k sends `forge.authorization_token` as `Bearer {token}` when the value is 64 lowercase hex and **verbatim otherwise**, so a bare token arrives scheme-less, and `forge.baseurl` userinfo as Basic; puppet-blacksmith and PDK send Bearer. Both clients drop `Authorization` on a cross-host redirect (captured 2026-09-26 from Puppet 7.20.0, OpenVox 8.28.1 and r10k 5.0.3; `formats/puppet.md`, "Authentication") |
| `luarocks` | Downloads: Basic from userinfo or `.netrc`, preemptive on the curl path and only after a challenge on the wget path. Uploads: the API key as a **URL path segment**, `{server}/api/1/{key}/{route}`, and nowhere else; without LuaSec, 3.13.0 rewrites an `https://` upload server to `http://` and sends the key in the clear (captured 2026-09-26 from LuaRocks 3.13.0 and 3.8.0; `formats/luarocks.md`, "Uploads: a registry token as the {key} path segment") |
| `ovsx` / VS Code-family editors (Open VSX) | Released ovsx sends the token **only as the `token` query parameter** on the publish routes (`POST .../api/-/publish?token=...`), never on reads; the repository head sends `Authorization: Bearer` to a registry reporting 1.3.0 or later; the reference also accepts `X-OpenVSX-Token`. No editor and no released ovsx read sends any credential: editors drop URL credentials and read a Basic challenge as "not found", so private reads use a `pull`-only token as a path segment under the format's mount, `{base}/-/t/{token}/...` (captured 2026-09-26 from ovsx 0.10.12 and 1.2.0, VSCodium 1.99 and 1.135 and code-server 4.139.1; `formats/openvsx.md`, "Authentication: the token in the query string, and reads that cannot authenticate") |
| `cabal` / `stack` (Hackage) | cabal 3.16.1.0 downloads: every request goes out bare and is repeated with Basic after a `401` carrying `WWW-Authenticate: Basic` (curl `--anyauth`), and over plain HTTP it forces Digest and never sends Basic; `cabal upload --token` sends **`Authorization: X-ApiKey {token}`** preemptively, an `Authorization` scheme rather than a bare header; `--username` and `--password` answer a Basic challenge. cabal 3.8.1.0 sends no usable credential (Digest only). Stack 3.11.1 and 2.9.1 send userinfo as preemptive Basic on every request (captured 2026-09-26; `formats/hackage.md`) |
| `go` | HTTP Basic from `.netrc` (the default `GOAUTH=netrc`; any username, the token as the password; a `machine` entry scopes it to the host, never a path) or from userinfo in the `GOPROXY` URL; or the headers a `GOAUTH` command prints per URL prefix (Go 1.24 and later), where `Authorization: Bearer <token>` is the one this registry accepts, and on a 4xx the command is re-run once with the URL and the response. Every form is **HTTPS only**: over `http://` the client sent no header at all with a matching `.netrc` or `GOAUTH`, and refused userinfo outright ("refusing to pass credentials to insecure URL") (observed on go1.25.5 against a probe, with `go help goauth`; `formats/go-modules.md`, "Non-interactive client auth") |
| `apt` | HTTP Basic from a netrc-format entry in `/etc/apt/auth.conf.d/*.conf` or from userinfo in the `URIs:` value, sent **preemptively on every request** once an entry matches, with no challenge round. Over plain HTTP apt uses only an entry annotated `http://`, and otherwise warns "Credentials for ... match, but the protocol is not encrypted. Annotate with http:// to use." and takes the `401`. A `401` or `403` on `InRelease` is printed as "is not signed", which names the wrong cause (captured from apt 2.4.14, 2.6.1, 2.8.3 and 3.0.3; `formats/debian.md`, "Authentication: Basic, preemptive, as apt sends it") |
| `dput` (Debian uploads) | One `PUT` per file, the `.changes` last. The first goes out bare; a `401` carrying `WWW-Authenticate: Basic` makes dput prompt for the password (so non-interactive uploads configure `login` and feed it the token) and repeat with Basic, after which every later file carries it preemptively. dput 1.2.4 drops the port from the upload host and reaches only the scheme's default port (captured from dput 1.1.3 and 1.2.4; `formats/debian.md`, "The wire surface, as captured") |
| `conan` | A token exchange. A request goes out anonymous first; on a `401` the client sends HTTP Basic (any username, the registry token as the password) to `GET /v2/users/authenticate` (Conan 1.66.0: `/v1/users/authenticate`), which answers `200` with **the same token** as a `text/plain` body (the shared layer writes it: "One route echoes a credential" below), and every later request to that remote carries it as `Authorization: Bearer`. The client stores the token in plaintext in `$CONAN_HOME/.conan.db` and parses no `WWW-Authenticate` value; a valid token lacking `pull` answers `404` and the client silently tries its next remote (captured from Conan 2.32.0, 2.0.17 and 1.66.0; `formats/conan.md`, "Authentication: a token exchange that returns the token") |
| `apk` | HTTP Basic in two modes: URL userinfo in the repository line **preemptively on every request**; `~/.netrc` (`machine {host} login __token__ password {token}`) and `HTTP_AUTH=basic:{realm}:{user}:{password}` **only after a `401` carrying `WWW-Authenticate: Basic`**, one retry per request, `HTTP_AUTH` being answered to any host that challenges because libfetch does not scope it by host. apk-tools 2.14.12's `apk policy` prints userinfo passwords in clear, and a `301` makes both lines print the redirect target with the password, which is why hosted routes never redirect; userinfo went over plain HTTP without complaint (captured from apk-tools 2.14 and 3.0; `formats/alpine.md`, "The wire surface, as captured" and "Authentication: preemptive userinfo, challenged netrc") |
| `pacman` | HTTP Basic **only after a `401` carrying `WWW-Authenticate: Basic realm="..."`**, from URL userinfo in a `Server` line or from root's `~/.netrc`. Under Arch's pacman 7.1 configuration (`DownloadUser = alpm`) the privilege-dropped downloader cannot read root's `.netrc` and the request stays at `401`; a `Server` line with userinfo in a root-only file included from `pacman.conf` works on every pinned client, because pacman parses its configuration before dropping privileges. `pacman-conf` and `pacman --debug` print the password, and Basic went over plain HTTP without complaint (captured from pacman 7.1 and 6.0.2 on Arch Linux and 7.1 on Manjaro; `formats/arch.md`, "Authentication: challenged Basic, and where the credential may live") |
| `mix` (Hex) / `rebar3` | The token string alone as the whole `Authorization` value, with no scheme, sent **preemptively**: on repository reads from `mix hex.repo add --auth-key` or rebar3's `repo_key` (or `HEX_REPOS_KEY`), on every package, tarball, docs and `public_key` request; on the API from `HEX_API_KEY` or the user-auth task. Neither parses a `WWW-Authenticate` value. Hex 2.5.1 exchanges a key for a hex.pm OAuth token whenever the repository is `hexpm` or an organization of it, and hangs against this registry, so a `hexpm`-named repository pointed here needs `mix hex.repo set hexpm --no-oauth-exchange`; under `HEX_MIRROR` (Hex) or `HEX_MIRROR_URL` (rebar3) neither client sends any key (captured from Hex 2.5.1 and 2.0.6 and rebar3 3.27.0; `formats/hex.md`, "Authentication: a bare token, on reads and on the API alike") |
| `cpanm` | URL userinfo in `--mirror`, sent as Basic **only after a `401` carrying `WWW-Authenticate: Basic`** (its wget backend); a `401` without that header ends the run. No upload (captured from cpanm 1.7049 and 1.7044; `formats/cpan.md`, "Authentication") |
| `cpm` / `carton` | URL userinfo in `--mirror` or the resolver URL (cpm) or in `PERL_CARTON_MIRROR` (Carton, through Menlo), sent as **preemptive** Basic. No upload (captured from cpm 1.1.5 and 0.997024 and Carton 1.0.35 and 1.0.34; `formats/cpan.md`, "Authentication") |
| `cpan` (CPAN.pm) | URL userinfo in `urllist`: over HTTP, HTTP::Tiny sends **preemptive** Basic; over TLS both pinned lines fetch through wget, which sends it only after the challenge. The URL, password included, is printed on every "Fetching" line and stored in `~/.cpan/CPAN/MyConfig.pm`, so the recipe is a `pull`-only token (captured from CPAN.pm 2.38 and 2.22; `formats/cpan.md`, "Authentication") |
| `cpan-upload` | **Preemptive** Basic, `-u` as the user and `-p` as the password: the registry token is the password and the user is free, which the publish binding reads as the author ID rather than as an authentication input (captured from cpan-upload 0.103019; `formats/cpan.md`, "Authentication") |
| `julia` (Pkg) | `Authorization: Bearer` with the `access_token` from `{depot}/servers/{host}_{port}/auth.toml`, a file keyed by the server URL's host and port, never its path, so every repository on one host shares one token; sent only over `https://` or to a loopback host. Pkg reads no `WWW-Authenticate` value, prints no body and retries the listing four times, and on a server failure, a `401` included, it falls back silently to its origin for General unless its network is restricted. An `expires_at` in the file makes Pkg warn and keep sending; this registry offers no `refresh_url` (captured from Julia 1.10.12 (Pkg 1.10.0) and 1.13.0; `formats/julia.md`, "Authentication: a Bearer token from `auth.toml`") |
| `swift` (SwiftPM) | Preemptive on every request to the host once configured, the archive and the publish included: `Authorization: Bearer` from `swift package-registry login --token` (or `--token-file`, or `SWIFTPM_REGISTRY_TOKEN` on 6.4 only), or Basic from `login --username --password`, a netrc entry whose `authentication` type is `basic`, or `SWIFTPM_REGISTRY_LOGIN` with `SWIFTPM_REGISTRY_PASSWORD` on 6.4 only. The credential is keyed per host (the `authentication` entry by host and port, netrc by host), so every repository on one host receives the same one, and 5.10 (6.1 by source) sends nothing without an `authentication` entry for the host in `registries.json`. A `401` carrying `WWW-Authenticate: Basic` **hangs 5.10 and 6.1 until killed**, while a Bearer challenge or none fails at once, so this format declares a Bearer challenge (captured from SwiftPM 5.10.1 and 6.4.0, with 6.1.3 corroborating; `formats/swift.md`, "Authentication: per host, Basic or Bearer, and never a Basic challenge") |
| `dart pub` | `Authorization: Bearer` from the store `dart pub token add <hosted-url>` writes (non-interactive with `--env-var NAME`), attached **only to URLs under the hosted-URL prefix**, compared lowercased and slash-normalised, so every URL the registry hands the client lives under it. The client **deletes its stored token on any `401`** under that URL, so a valid token is never answered `401`; it refuses to store a token outside `^[a-zA-Z0-9._~+/=-]+$` (the `swr_` shape is inside it) and a plain-`http` hosted URL unless the host is loopback. The format declares the repository specification's mandated `WWW-Authenticate: Bearer realm="pub", message="..."`, whose message the client prints (grounded in the `dart-lang/pub` client source and the hosted repository specification v2, **not yet in captured traffic**, which `formats/pub.md` AC4 supplies; `formats/pub.md`, "Authentication: the token, the challenge, and the deletion trap") |
| `vagrant` | Preemptive and never challenged. `Authorization: Bearer` from `VAGRANT_CLOUD_TOKEN` (else the token `vagrant cloud auth login` stored, else `ATLAS_TOKEN`) on the catalog `HEAD` and `GET` and the box `GET` whenever the URL's **host** equals `VAGRANT_SERVER_URL`'s, scheme and port ignored, so over plain HTTP as readily as TLS, and to a cross-host redirect target under `--location-trusted`; one token therefore reaches every repository on the host. URL userinfo is sent as Basic on the catalog requests only, never to the box URLs the catalog names, and is stored in plaintext as `metadata_url`. `VAGRANT_SERVER_ACCESS_TOKEN_BY_URL` sends `?access_token=<token>` and no header, which is not a presentation form here ("A parameter that is not a form" below) (captured from Vagrant 2.3.7 and 2.4.9; `formats/vagrant.md`, "Authentication: a Bearer the host decides") |
| `opam` | No credential mechanism of its own: URL userinfo in the repository URL is sent as HTTP Basic **preemptively** on the index and every cache request, with no challenge, because the download tool is curl and the cache URL is built from the repository URL. Both clients print the token (in "retrieved ..." lines, `opam repository list` and "no changes from ...") and write it to `repo/repos-config` and the state cache, so the recipe is a `pull`-only token; the rewritten absolute source URL is fetched with no credential, which is why the served `repo` file keeps `archive-mirrors: "cache"` (captured from opam 2.1.6 and 2.6.0; `formats/opam.md`, "Authentication: Basic from URL userinfo") |
| `brew` (Homebrew) | On the OCI-shaped routes under `HOMEBREW_ARTIFACT_DOMAIN`: `Bearer {HOMEBREW_DOCKER_REGISTRY_TOKEN}`, else `Basic {HOMEBREW_DOCKER_REGISTRY_BASIC_AUTH_TOKEN}`, else nothing. On a bottle manifest under `HOMEBREW_BOTTLE_DOMAIN`, 7.0.6 sends the same header or else the placeholder `Bearer QQ==` (nothing with `HOMEBREW_DOCKER_REGISTRY_BASIC_AUTH_TOKEN=none`), an invalid credential in a recognised form, answered `401` and never anonymous, with no special case. Flat routes, a tap's `root_url` and the API routes never carry a header; a netrc credential reaches them only when `HOMEBREW_CURLRC` names a curl config with `netrc-file`, as preemptive Basic, because brew's curl runs with `--disable`. Nothing else is sent, in answer to a challenge or otherwise (captured from brew 7.0.6 and 4.6.20; `formats/homebrew.md`, "Authentication") |

No identity provider solves this, Zitadel included. It is not an IdP shortcoming: it is a
protocol requirement of 33 separate client tools. **Registry tokens must be issued and verified
by us regardless of which IdP handles humans.**

Per the constitution, the client is the specification and this table is working knowledge, not
ground truth: each row must be confirmed against captured traffic from the real client before
that format's auth conformance cases are written. Every row that names its captured client
versions (or a capture date) and a format spec is grounded in captured traffic rather than
recollection, the `helm` row included since `formats/helm.md`'s captures replaced the
"Bearer or Basic depending on the endpoint" guess it once carried. The `npm` and `pip` rows
await their captures; the `dart pub` row is grounded in the client's source rather than its
traffic, and says so; the `go` row in a probe of go1.25.5. The table is the input to the presentation-form table in Design
(the machine surface): every form a row names appears there, and a form appears there only
because a row needs it.

### What is outsourced

Everything genuinely dangerous that can be: password storage, MFA, account recovery, federation,
SSO. Those live in the identity provider and no part of this spec reimplements them.

Two deliberate exceptions remain ours, and pretending otherwise would hide attack surface. The
local admin credential is a stored password, however small its surface. And an OIDC relying
party always owns its own application session: only the provider's login session is outsourced,
while the cookie the registry issues after OIDC completes, its lifetime, logout, and the CSRF
defense on state-changing UI routes are this spec's responsibility (see the human surface in
Design).

## Scope

**In scope**

- **Human identity**: a standard OIDC client (Authorization Code with PKCE) usable with any
  compliant provider - Zitadel, Keycloak, Authentik, Entra, Okta, Google. Provider-agnostic by
  construction.
- **Local admin fallback**: a single bootstrap account so the server is usable without an IdP.
- **Machine identity**: scoped, revocable registry tokens that the clients above can present,
  **in every presentation form the client table needs**: the `Authorization` schemes, the
  vendor headers, the URL-borne segments and query parameter, each with its redaction and its
  plaintext refusal (Design, "Presentation forms"; AC31). The verifier is one, whatever the
  form; a new form is one verifier change inside AC10's review scope, never a second verifier
  (the boundary `credential-management.md` settled in its resolved presentation-forms decision,
  was Q6: stored and owned credentials there, presented, verified and ephemeral here).
- **Signed-request verification** for the one client family that signs requests instead of
  presenting a token: Chef's mixlib-authentication protocols 1.0, 1.1 and 1.3, verified with the
  standard library against a registered RSA public key whose storage and lifecycle are
  `credential-management.md`'s (its `/api/v1/keys` surface, AC12 there). AC34 asserts it.
- **The token service and its two ephemeral products**: the OCI `WWW-Authenticate` challenge,
  the token endpoint and short-lived scoped bearer tokens per the distribution spec; and the
  **download capability** Terraform's byte routes need, minted from the same machinery, bound to
  one object, carried in a path segment (Design, "The token service's two ephemeral products";
  AC33).
- **Authorization**: permissions evaluated centrally, never in a handler. Repository-scoped is
  the base unit, with **path and tag patterns** layered on it, brought into scope 2026-09-23 so a
  CI credential can be scoped to `prod/*` or to one tag rather than a whole repository.

  This one carries a correctness cost as well as a scope one, and it is not waived by the
  scope decision: every pattern rule is another way to grant more than intended. Pattern
  matching is therefore deny-by-default, has no implicit wildcards, and is covered by
  conformance cases asserting that a narrowly scoped token is refused outside its pattern.
  A pattern narrows within one identity-bound repository and never ranges over repository
  names. The central authorizer matches it against the addressed object each handler's
  `Scope(r)` reports, a field the pinned `Scope` type gained out of cycle for this purpose,
  under the grammar in Design ("Pattern scopes"). AC19 and AC24 through AC26 assert it.
  Exactly one entry into a handler skips the authorizer, the proxy layer's revalidation replay,
  and it is named, bounded and placed on AC10's review surface here (Design, "The one entry that
  skips the authorizer"; AC36).
- **Human grants**: the vocabulary between "nothing" and "administer the registry", which is
  per-repository grants in the machine vocabulary plus the single global admin role (Design,
  "Human grants").
- **Token shape**: a token's scopes bind to one repository unless it was created with the
  explicit multi-repository opt-in, and its authority never exceeds its owning principal's
  current grants (Design, the machine surface).
- **Plaintext refusal**: a credential presented over plaintext HTTP is refused unless the
  operator sets an explicit flag (Design, the TLS paragraph).

**Out of scope**

- The token-management product surface (issue, list, rotate, revoke), the expiry-warning
  criterion it carries, the robot-account principal, the stored side of registered public keys,
  and the OIDC token exchange for CI. They belong to the dedicated sibling spec
  `foundation/credential-management.md`, authored 2026-09-27, which must reach `planned` before
  OCI's Phase 1 depends on it: its `/api/v1/tokens` surface, its AC5 (a token within the warning
  window listed as `expiring` with its `expires_at`, before it fails), its "Robot accounts" (AC9
  there: a robot's tokens survive the departure of whoever created them), its `/api/v1/keys`
  (AC12 there) and its `/api/v1/tokens/exchange` (AC13 there). This spec keeps the mechanism and
  the rules that surface must obey (AC6, AC16, AC29, AC30), and every credential it stores is
  verified by this spec's verifier, so the exchange route and the key routes sit inside AC10's
  external review scope even though their product shape is not specced here.
- Delegated grant administration. In v1 only the global admin creates or revokes grants; a
  per-repository "may manage this repository's grants" right would be a fourth action this
  vocabulary does not have, raised as a change to it rather than stretched out of `admin`.

- Local *user management*: no user CRUD, no groups, no password reset, no MFA, no lockout policy.
  The local account is a bootstrap path, not a user system. Teams wanting users configure OIDC.
- Making Stackweaver an identity provider for this registry. Pointing both products at the same
  IdP already delivers one central login without coupling their release cycles. Deferred, not
  rejected.


## Design

### Nothing is invented

This is the binding constraint of the whole spec, and it is stated as a rule rather than a
preference:

- OIDC via a maintained standard library (`coreos/go-oidc`). **No hand-rolled token validation,
  no hand-parsed JWTs, no custom signature checking.**
- Registry tokens are generated from `crypto/rand`, at least 256 bits, encoded with a
  non-secret prefix used only for lookup and display. The token string carries no structure
  beyond that prefix: no embedded claims, no identifiers, nothing parseable. Its concrete shape
  is `swr_<lookup prefix><secret>`: the fixed brand marker `swr_`, then the lookup prefix, then
  the secret, all base32 without padding so the whole value survives every client's
  configuration file and a URL path segment (`credential-management.md`, "The token surface",
  which fixes the shape because its surface displays it; AC1 there). The marker exists for the
  reason PyPI's `pypi-` does, so secret-scanning tooling recognises a leaked value; it grants
  nothing and parses to nothing.
- Tokens are stored one-way as **SHA-256 with a constant-time comparison**, not bcrypt. Bcrypt's
  cost is a defence low-entropy passwords need against offline cracking; a 256-bit random token
  has no entropy problem, so the slowness buys nothing and is paid on every one of the hundreds
  of requests in a single `npm install` or `docker pull`. This is what GitHub and most registries
  do for API tokens. **This is a deliberate divergence from the Stackweaver port**, which uses
  bcrypt for the same reason it also authenticates lower-entropy material.
- JWT signing via a maintained library, with keys from the configured signing key.
- **No custom cryptographic scheme anywhere.** A design that invents one is a defect, not a
  trade-off, and reviewers should treat it as such.

Stackweaver has shipped the machine half already: bcrypt-hashed keys with a prefix for fast
lookup (`VerifyAPIKey` narrows by `GetByPrefix`, then verifies), a scope model, and fuzz
targets over prefix handling and key verification (`FuzzGetKeyPrefix` and `FuzzVerifyKey` in
`backend/internal/services/apikey/` in that repo, re-verified 2026-09-24). The HMAC-signed
scoped capability tokens live elsewhere in that codebase - `mintArtifactToken` /
`verifyArtifactToken` in `backend/internal/api/v2/handlers/registry_artifact_token.go`, not in
the apikey service (attribution corrected 2026-09-24). This is a port of exercised code, not a
greenfield design - with one deliberate change: the hash function becomes SHA-256, because
bcrypt's cost profile does not survive a registry request path.

### The two surfaces

**Human**: browser hits the UI, OIDC Authorization Code with PKCE against the configured
provider, provider returns identity, we map it to a local principal and issue a session. If no
provider is configured, the local admin account authenticates instead; once a provider is
configured the local admin is disabled unless the explicit keep flag was set (the resolved
break-glass decision below).

The mapping to a local principal is keyed on the provider's `(issuer, subject)` pair and
nothing else. An email claim is display metadata, never an identity key: emails are
reassignable, unverified on some providers, and collide across providers, so keying on email
is an account-takeover primitive. Nor is validation left to library defaults: the flow must
verify the ID token's signature against the provider's published keys, its issuer, its audience
(this client's ID) and its expiry, and must bind the authorization flow with `state`, `nonce`
and the PKCE verifier. `coreos/go-oidc` covers the token checks when configured to; the flow
bindings are relying-party code and belong to this spec's surface. The browser routes are
`/ui/auth/login` (starts the OIDC flow, or renders the local admin form when no provider is
configured), `/ui/auth/callback` (the redirect target) and `/ui/auth/logout`, mounted by
`internal/auth` under the reserved `ui` segment `web-ui.md` owns (`format-handler-interface.md`,
the reserved-segment table); `web-ui.md` consumes them and adds nothing to the flow. The session
the registry then issues is a server-side row referenced by a cookie set HttpOnly, Secure,
`SameSite=Lax` and `Path=/`, with the lifetime `auth.session.lifetime` ("Configuration" below).
CSRF defense on state-changing UI routes is the **double-submit** pattern: at session issue the
server also sets a non-HttpOnly cookie `stackweaver_csrf` holding a random value bound to the
session; the client sends it back as `X-CSRF-Token` on every `POST`, `PUT`, `PATCH` and
`DELETE`, and a mismatch or absence is refused `unauthenticated`. `SameSite=Lax` is defense in
depth, not the defense, because it does not cover a top-level `GET`-initiated navigation.
`GET /api/v1/session` answers the signed-in principal, its kind and its grant summary, or, for a
caller with no session, `200` with `principal_kind: anonymous` and no grants, never a `401`
(`management-api.md` AC28), so the UI learns who it is without a second identity path and its
first paint needs no error branch (`web-ui.md`, "Sign-in" and "CSRF"; its AC13 asserts the
header from the UI's side, AC22 here from the server's). The anonymous answer is not the
downgrade AC12 forbids: no credential was presented, the route discloses nothing but that fact,
and a request to it that does present a credential is verified like any other and answered as
that principal or refused.

**Zitadel is the intended provider for the managed service**, pointed at the same instance the
managed Stackweaver uses, so a customer has one login across both products. That is a
configuration choice and not a coupling: no Zitadel-specific code exists on the path, and a
self-hoster pointing at Keycloak, Authentik, Entra or Okta gets identical behaviour. AC1 exists
to keep it that way by requiring two different providers to pass.

**Shared login is not shared authorization.** Pointing both products at one provider means the
same human arrives with the same identity, and nothing more. Registry permissions are granted in
the registry: a Stackweaver administrator is not implicitly a registry administrator, and a new
identity arriving from the provider gets whatever the registry's own default-role policy says,
which is a separate decision from authentication. Conflating the two is how an SSO integration
quietly becomes a privilege-escalation path.

**Machine**: a token presented in whichever form the client sends, from the table below.
Verification resolves the token to the same principal and scopes whatever the form, and an
`Authorization` value in no recognised form is an authentication failure, never the anonymous
principal (AC31). The Basic-auth path exists because pip and Maven have no alternative, not
because it is preferred. In the Basic form the password field carries the token and the
username is not an authentication input, matching the pip `__token__` convention. A scope
binds to the repository's identity, never its name: a deleted and recreated repository of the
same name is a new repository, and tokens scoped to the old one grant nothing on it -
name-bound scopes are how stale grants silently reattach.

#### Presentation forms

One verifier, one lookup, one redaction rule, and this table of the places a registry token
may arrive. The table is the whole list: a form not in it is not a credential, and a new client
that needs one adds a row here, inside AC10's review scope, rather than a check in a handler
(the resolved presentation-forms boundary in `credential-management.md`, was Q6, which leaves
every form, its redaction and its plaintext refusal to this spec). Forms marked **universal**
are accepted on every route of every format; a **route-scoped** form is accepted only on the
routes the named format's handler declares for it (the resolved off-route decision below, was
Q24, states how and what an off-route presentation means).

| Form | Where the token sits | Accepted on | Needed by |
|---|---|---|---|
| `Bearer` | `Authorization: Bearer <token>` | universal | npm, helm (`cm-push --access-token` only), terraform and tofu, composer, puppet, r10k, mamba and pixi, rattler-build, ovsx head, go (a `GOAUTH` command), conan (after its exchange), julia Pkg, SwiftPM, dart pub, vagrant, brew |
| Basic password | `Authorization: Basic`, the token as the password, the username ignored; URL userinfo arrives in this form | universal | pip, twine, mvn, gradle, sbt, lein, dotnet, composer, conda family, R, renv, pak, dnf, zypper, knife, berks, luarocks, stack, cabal 3.16, helm (classic repositories), go (`.netrc`, `GOPROXY` userinfo), apt, dput, conan (at its exchange), apk, pacman, cpanm, cpm, Carton, CPAN.pm, cpan-upload, SwiftPM, vagrant (catalog userinfo), opam, brew |
| `Token` | `Authorization: Token <token>` | universal | ansible-galaxy |
| scheme-less | the whole `Authorization` value is the token | universal | cargo, r10k with a non-hex token, mix, rebar3 |
| `X-ApiKey` scheme | `Authorization: X-ApiKey <token>` | universal | cabal 3.16 `upload --token` (an `Authorization` scheme in the capture, not a bare header) |
| `X-NuGet-ApiKey` | a bare request header | route-scoped: NuGet's `PackagePublish` routes | dotnet |
| `X-Jfrog-Art-Api` | a bare request header | route-scoped: Chef's read routes (universe, version documents, downloads) | berks and chef-cli with the `artifactory` source |
| `X-OpenVSX-Token` | a bare request header | route-scoped: Open VSX's four write routes | the Open VSX reference's clients |
| `token` query parameter | `?token=<token>` | route-scoped: Open VSX's four write routes | released ovsx, which sends nothing else |
| root path token | `/t/{token}/` between the host and the format mount, a root-anchored reserved segment the registration layer must hold beside its carve-outs, stripped by the shared authorizer before routing | universal, on every format mounted beneath it | conda, mamba, micromamba, pixi |
| upload key segment | `api/1/{key}/` inside the LuaRocks mount | route-scoped: LuaRocks's upload routes | luarocks |
| read token segment | `-/t/{token}/` inside the Open VSX mount, honoured **only for a token holding no action but `pull`**; a token holding `push` or `delete` presented there is refused | route-scoped: Open VSX's read routes | VS Code-family editors, which drop URL credentials and read a challenge as "not found" |
| download capability | `/{format}/{repository}/-/c/{capability}/` on byte routes; not a registry token but the token service's second product, below | route-scoped: Terraform's byte routes | terraform, tofu |
| signed request | Chef's `X-Ops-*` headers, a signature over a canonical string against a registered RSA public key; not a token at all, below | route-scoped: Chef's write routes | knife |

Three rules hold across the table, and they are the reason it is one table rather than a note
per format:

- **Where the credential sits is declared, never guessed.** For a route-scoped form the handler
  declares, beside its route-to-scope mapping, which routes accept the form and where in the
  request it sits (a header name, a query parameter name, or the path position of a segment);
  the shared layer extracts it, marks it secret, verifies it and redacts it before the handler
  sees the request, so a handler never reads a credential. How the declaration reaches the
  shared layer is the interface re-open input `format-handler-interface.md` already records for
  URL-borne credentials; the root path token needs no declaration, because it precedes every
  mount.
- **Two forms on one request are both verified.** NuGet's challenged push carries
  `X-NuGet-ApiKey` and Basic together: each is verified, a failure of either rejects the request
  (never a downgrade to the one that passed, never anonymous), and the request's authority is
  the intersection of the two.
- **Redaction and plaintext refusal follow the form.** Every extracted value, header, segment,
  parameter or signature header alike, is passed to `telemetry.MarkSecret(ctx, value)` before
  any other use, so it cannot reach a log line, a span attribute, a metric label, an error body
  or an audit record (AC7; `observability.md` AC9 asserts the scrubbing layer from its side),
  and a request presenting any form over a connection the server did not terminate with TLS is
  refused before lookup exactly as a Bearer would be (AC27). A credential in a URL is the
  hardest case, because it also lands in client output, caches and the conformance corpus;
  `conformance-harness.md` AC13's redaction rule names each URL-borne form.

**One route echoes a credential, and the shared layer writes it** (the resolved exchange-echo
decision below, was Q25). Conan's `users/authenticate` exchange takes the registry token as the
Basic password and answers `200` with that same token as its `text/plain` body
(`formats/conan.md`, its resolved token-exchange decision, was Q6), which the "handler never
reads a credential" rule above forbids a handler to produce. So the handler declares the route as
an **exchange-echo route** beside its route-to-scope mapping, and the shared layer answers it:
it verifies the Basic password and authorizes the route's declared scope exactly as for any
request (Conan reports it a `pull` descriptor), then writes `200`, `Content-Type: text/plain`,
`Cache-Control: no-store` and the verified value as the body, marked secret like every extracted
value; a failed verification is the ordinary `401`, never anonymous, and a token lacking `pull`
is the existence rule's `404`. The handler never runs for that route and never sees the value.
No other format declares one, and a new one is a row here inside AC10's review scope. AC35
asserts it.

**A parameter that is not a form is not a credential, and is still redacted.** Vagrant's
`VAGRANT_SERVER_ACCESS_TOKEN_BY_URL` mode sends `?access_token=<token>` and no header. The
parameter is not a row of the table on any route, so the request is the credential-less request
it presents itself as and is answered as such (`formats/vagrant.md`, "Authentication: a Bearer
the host decides"); its value, which is a registry token, still never reaches output, because
the request logger never records a query string and `telemetry.RedactURL` replaces the
`access_token` value in any logged URL (`observability.md`, "Redaction", its AC9), and the
conformance corpus redacts it under `conformance-harness.md` AC13.

**A token's scopes bind to one repository by default** (the resolved multi-repository-token
decision below). It may carry several actions on that repository, each optionally narrowed by a
pattern, and a leaked token's blast radius is then one repository. A token spanning several
repositories exists only by a deliberate opt-in at creation (the resolved two-repository
credential decision below), the same shape as a non-expiring token: each repository is named
explicitly by identity, never by a pattern or wildcard, and a scope on a repository not named is
refused. The concrete need behind the opt-in is the cross-repository blob mount, which one
credential performs against two repositories and which the flagship OCI conformance gate
exercises (`formats/oci.md`, "The suite credential spans two repositories"). A CI job spanning
ten repositories holds ten tokens unless its owner deliberately mints one enumerated token.

**A token never exceeds its owner** (the resolved token-authority decision below). Every token
belongs to a principal, and its effective authority on each request is the intersection of its
own scopes and that principal's current grants. Minting a token with a scope the owner does not
hold is refused, and revoking a person's grant removes the matching authority from every token
they minted on the next request, with the one exception AC5 already names: an already-issued
OCI JWT keeps the scope it was minted with until its minutes-scale expiry. A token carries no
administrative authority, since the scope vocabulary has no action for it; administering the
registry takes a human session. The accepted cost is that a departing administrator's CI tokens
lose their authority with them, so automation should be owned by a principal that outlives any
one person. That principal exists: the **robot account** of `credential-management.md` ("Robot
accounts", `/api/v1/robots`), a principal kind that cannot log in, holds only the grants the
admin gives it, and owns tokens whose intersection is with the robot's grants rather than the
creator's, so they lose nothing when the person who created the robot leaves (its AC9). It
changes no evaluation rule here: AC14 and AC30 apply to a robot exactly as to a human.

**TLS is required on every credential-bearing path** - every form in the presentation-form
table, the OCI token endpoint, the capability-bearing byte routes, Chef's signed writes, and
`credential-management.md`'s `/api/v1/tokens/exchange`, whose body carries an identity token -
since Basic is plaintext without it and several clients (luarocks without LuaSec, puppet, stack,
dnf following an `xml:base`) send a credential over plain HTTP as readily as over TLS. The server enforces this
rather than documenting it (the resolved plaintext-credential decision below): a request that
presents a credential over a connection the server did not itself terminate with TLS is refused
before the credential is looked up, verified or logged, with an error stating that credentials
require TLS, unless the operator has set the explicit plaintext flag (`--allow-plaintext-auth`
or equivalent). The refusal is identical for a valid and an invalid credential, so a plaintext
request is not a validity oracle either. The flag doubles as the behind-a-terminating-proxy
declaration: the server never infers TLS from `X-Forwarded-Proto` or any other header, because
a header a client can send cannot certify a transport. A refused request is never answered as
the anonymous principal (the rule AC12 states), and a request presenting no credential is
unaffected. Plaintext credential acceptance thereby sits behind the same explicit opt-in as
every comparable risky state (anonymous read, non-expiring tokens, the kept break-glass
account); the deployment documentation must still name the flag and what setting it asserts.

#### The token service's two ephemeral products

**OCI specifically** gets a third path because the distribution spec mandates it: an
unauthenticated request receives a `WWW-Authenticate` challenge naming a realm and scope, the
client exchanges its credential at the token endpoint, and receives a short-lived JWT carrying
the granted scope. That flow is spec-defined, so the official conformance suite exercises it.

**Terraform gets the same machinery under a different name.** No Terraform or OpenTofu client
sends a credential to any byte URL, so `formats/terraform.md` (its resolved download-capability
decision) has every metadata response to an authenticated caller name its byte URLs with a
**download capability** as a path segment, `/terraform/{repository}/-/c/{capability}/...`,
minted by this token service rather than by a scheme of that format's own: the same fixed
algorithm, the same dedicated `kid`-selected key, the same minutes-scale expiry. It carries the
repository, `pull`, the principal and **the exact object** the byte route addresses, so it
fetches that version's bytes and nothing else, and it never carries more than the minting
request's own scope, pattern included. The byte route's object must equal the one the
capability names or the request is refused `401`; an expired or foreign capability is refused
`401`, never served as anonymous (AC12); the check happens when the request starts, so a long
download is not cut off mid-body; and a caller with no credential on an anonymously readable
repository gets byte URLs with no capability segment. Its lifetime is its revocation window
exactly as the OCI JWT's is (AC5): revoking the caller's credential stops new metadata responses
at once and leaves already-minted capabilities valid until they expire. It is a credential in a
URL, so it is redacted like every other URL-borne form (AC7). It is the one credential nobody
can list or revoke, which `credential-management.md` accepts in its resolved boundary decision
(was Q6) as the JWT's window under another name. AC33 asserts all of it; the format's own AC4
runs the real clients against it.

Both products are what "the token service" means below: everything said of the JWT's signing,
verification, key and lifetime holds for the capability.

The token service is where an implementer is most tempted to invent, so its obligations are
stated: the JWT's signing algorithm is fixed by configuration and **never read from the token's
own header** (algorithm-confusion is the classic JWT break); verification checks signature,
expiry, issuer and audience, and grants exactly the scopes issued, nothing wider, including any
pattern those scopes carry ("Pattern scopes", below); expiry is
short enough to be measured in minutes, because that lifetime is also the revocation window; and the signing key is dedicated to this service and rotatable without failing in-flight
pulls (`kid` selection is the standard mechanism). **The token lifetime is the revocation
window, accepted deliberately**: revocation is not checked per JWT use, because a database
lookup on every layer pull deletes the reason the self-contained token flow exists. Minutes-scale
expiry bounds the exposure, and AC5 names the window rather than promising it away. The concrete claim set, the key's provenance
and its storage are implementation decisions AC10's external review must cover explicitly.

A token request naming scopes on several repositories, as a cross-repository blob mount does,
is answered with a JWT carrying only the scopes the credential actually holds, which for a
single-repository token is at most its own repository's; the endpoint grants the permitted
subset rather than failing the request. That the distribution clients handle a subset grant
this way is working knowledge, to be confirmed against captured traffic before OCI's auth cases
are written.

#### Signed requests: the one client that carries no token

knife signs `share` and `unshare` with the client's RSA private key (mixlib-authentication,
protocol 1.0 on share and 1.1 on unshare, captured on both knife generations) and has no field a
token could travel in, so `formats/chef.md` adopted **shares authenticated by registered RSA
public keys verified centrally**. The credential is a public key a principal registers through
`credential-management.md`'s `/api/v1/keys` (a PEM RSA key of at least 2048 bits, a unique
non-secret key name that knife sends as `X-Ops-Userid`, scopes and expiry exactly as a token's,
under the same four rules; its AC12). The registry never sees a private key and stores nothing
secret, so "never stored recoverable" holds by construction. This spec owns the verifier:

- **Standard library only.** For protocols 1.0 and 1.1 the signature is PKCS #1 v1.5 over the
  raw canonical string, verified by `rsa.VerifyPKCS1v15` with `crypto.Hash(0)`; for 1.3 it is
  PKCS #1 v1.5 over the SHA-256 of the canonical string. Building the canonical string
  (`SignedHeaderAuth#canonicalize_request`: method, the hashed or raw canonical path, the content
  hash, the timestamp, the user id, plus the sign description and `X-Ops-Server-Api-Version` in
  1.3) is request parsing, not a cryptographic primitive, so AC9 holds; it is the ecosystem's
  published scheme, not one this registry designs, so "Nothing is invented" holds; and because
  a canonicalisation mistake is a signature bypass, **canonical-string construction joins AC10's
  external review scope by name**.
- **Every check runs before anything is written**: the sign description is one of `sha1;1.0`,
  `sha1;1.1` or `sha256;1.3`; the timestamp is within 15 minutes of the server clock; the key
  name resolves to an unexpired, unrevoked key whose scopes authorize the route's `(repository,
  action, object)` like any token's; the signature verifies over the canonical string; and the
  content hash equals the digest of the request's file part for a multipart request (mixlib's
  `hashed_body` rule, confirmed by capture: `X-Ops-Content-Hash` equalled the SHA-1 of the
  tarball part) and of the whole body otherwise. The signature and timestamp are checked when
  the headers arrive; the content hash is known only at the end of the tarball part, so **the
  shared layer checks it there**, as it checks a digest at the end of an upload, and a mismatch
  aborts the write before commit. Every failure is an authentication error, never anonymous.
- **The accepted costs are the ecosystem's**, named here so they are not discovered later:
  protocols 1.0 and 1.1 hash with SHA-1 and knife uses them, so refusing them refuses the client;
  the signature binds the tarball part and the path, not the host; and a captured request can
  be replayed within the 15-minute window, which TLS bounds and which buys an attacker a `409`
  on a share or a `404` on an already-executed unshare. The signed headers are credential
  material for redaction (AC7) and a signed request over plaintext is refused before
  verification (AC27).

AC34 asserts the verifier; `formats/chef.md` AC6 runs the real `knife` against it.

### Bootstrap, first administrator, and what a new identity gets

**The local admin credential** is generated from `crypto/rand` at first start and emitted to the
server log exactly once; only its hash is stored. There is no default password to forget
changing. AC7 forbids credentials in logs, so that single deliberate emission is an explicit,
narrow carve-out rather than an exception discovered later.

**Configuring OIDC requires naming at least one admin identity** by `(issuer, subject)` before
the local admin is disabled. This makes the locked-out state **unrepresentable**: the only way in
cannot be turned off without designating a replacement. The alternatives were a first-login-wins
race, which on a reachable registry is a real window for the wrong person to become your
administrator, and keeping the local account indefinitely, which is how a temporary standing
credential becomes permanent.

Accepted cost: one more required configuration field, and the operator must know their own
subject claim, which IdP consoles do not always make obvious.

**A brand-new identity from the provider receives nothing.** Authentication succeeds and
authorization is empty until granted. Repositories are private by default, and nothing-by-default
for principals is the same posture applied to people. Onboarding therefore has an explicit grant
step, deliberately. What that grant *is* - the human-side authorization vocabulary the central
evaluator applies between "nothing" and "administer the registry" - is defined in "Human
grants" below.

### Token expiry

Registry tokens **expire by default**, with a non-expiring token available only by deliberate
opt-in - the same shape as the anonymous-access decision, where the risky state requires someone
to choose it.

Accepted cost: a CI token that silently expires breaks a pipeline at an inconvenient moment.
Expiry warnings must therefore be visible well before the event, not delivered as a 401. No
acceptance criterion in this spec polices that obligation, by decision rather than oversight
(the resolved expiry-warning placement below): no token-management surface (issue, list, revoke
as a product surface) is specced here, and an AC against an unspecced producer is untestable,
the same reasoning `supply-chain-policy.md` applied to its absent signature AC. The criterion is
an outbound dependency on `foundation/credential-management.md` (the resolved surface-placement
decision below), whose token surface `formats/oci.md` made a Phase 1 dependency when it adopted
registry tokens as the `docker login` credential. That spec, authored 2026-09-27, carries it as
its AC5: every token row has a derived state, `active`, `expiring`, `expired` or `revoked`, a
token within `credentials.expiry_warning_window` (14 days by default) is listed and read as
`expiring` with its `expires_at` while still authenticating, and `expiring=true` filters the
listing to what is about to break. That is exactly the obligation stated here, expiry visible
and near-expiry distinguishable before the token fails, and this spec now cites it rather than
owing it.

### Visibility and the anonymous principal

Repositories are private by default; anonymous read is enabled per repository by explicit
action (the resolved anonymous-access decision below). Two evaluation rules keep that decision
true under failure, and they are design, not implementation niceties:

- **Absence fails closed.** A repository with no readable visibility record is private. No
  default value, migration state or partial write may yield readable.
- **A failed authentication is never anonymity.** A request presenting an invalid, expired or
  revoked credential is rejected with an authentication error; it is not downgraded to the
  anonymous principal, even against a repository with anonymous read enabled. The downgrade is
  the classic silent failure: a broken CI credential keeps "working" against public
  repositories, and becomes a free probing identity against private ones. Anonymous applies
  only when no credential is presented at all.

**Missing and forbidden are indistinguishable to a caller without read access**: both return
404. Private repository names are frequently guessable, and a distinct 403 confirms which guesses
are right, enumerating the private namespace. The accepted cost is a confusing support case where
a legitimate user with a typo is told "not found" when the real problem is permission.

**A credential-less request is challenged, and the challenge is uniform.** A request presenting
no credential to a repository that is not anonymously readable answers `401` with the
`WWW-Authenticate` challenge the format declares (`Basic realm="..."` for most; `Bearer` for
OCI, Open VSX, Swift, pub and Vagrant, Swift's because a Basic challenge hangs SwiftPM 5.10 and
6.1 until killed and pub's because its repository specification mandates `Bearer realm="pub",
message="..."`; Cargo's `login_url` form), byte-identical for a private, a missing and someone
else's repository, so the challenge is not an existence oracle either (AC17). The challenge is
not decoration: zypper, NuGet, Maven and Gradle reads, pak, cabal 3.16, pacman, apk's `.netrc`
and `HTTP_AUTH`, cpanm and CPAN.pm's wget path, and dput send **nothing** until a `401` carrying
`WWW-Authenticate: Basic` arrives, so a format whose handler omitted the challenge would lock
those clients out while passing every credentialed case. Which challenge a
format declares is format knowledge, recorded in its spec; that it is emitted identically is
this spec's rule.

### Authorization is central, never per-handler

Per `CLAUDE.md`, auth is a shared concern and handlers must not implement it. Because handlers
receive raw `*http.Request`, the compiler cannot hold this boundary, so it is held mechanically:
every format's conformance case set must include unauthenticated and unauthorized cases, runner
enforced (`format-handler-interface.md` AC7).

**How the shared layer learns what it is authorizing:** each handler declares a route-to-scope
mapping, from its own routes to a `Scope` - the repository, the action, and the object the
request addresses - and the shared layer evaluates that mapping and enforces the result. Format
knowledge stays in the format - including where the repository ends inside a slash-bearing OCI
name under `/v2/` (the first component is the repository and the rest is the image,
`formats/oci.md`'s resolved name-split decision, was Q8), which would otherwise put per-format
URL grammar into security-critical shared code. The
addressed object is what pattern scopes match against; it entered the pinned `Scope` type
(`format-handler-interface.md`, "The pinned method set") as an out-of-cycle amendment made for
this spec's pattern-evaluation decision.

The accepted cost is that a handler declaring its mapping wrongly under-protects itself. That is
exactly what AC7's unauthenticated and unauthorized cases catch, which is why they are
runner-enforced rather than advisory.

**The one entry that skips the authorizer: the revalidation replay.** Every request reaches a
handler through the router, and the router runs this spec's authorizer over the handler's
`Scope(r)` before the handler sees it; AC18 and the per-format cases above hold that path. There
is exactly one other way into a handler, and this spec names it here because it is the boundary
this section exists to keep single. `proxy-cache.md`'s resolved revalidation-replay decision (was
Q18 there, its AC26) keeps a `remote` reached only through a `virtual` fresh with a
`proxy.revalidate` job that replays the remote handler's own proxied route in process, below the
authorizer, with the cached document's validators, a response writer that discards the body, a
replay marker and no principal. `format-handler-interface.md`'s resolved replay-entry decision
(was Q11 there, its AC18) gives that reach one shape, the **replay entry**: a function value built
once in the server's composition root from the router's handler table and mount rules, injected
into `internal/proxy` and nothing else, which dispatches by repository and recorded route without
calling `Scope(r)`. Its mechanical enforcers are three architecture and unit tests owned by those
two specs, and this spec adopts them as its own: `internal/server/arch_test.go` (the entry
constructed only in the composition root and handed only to `internal/proxy`),
`internal/server/replay_entry_test.go` (a fixture route denied through the router and served
through the entry, so the router's own entry always authorizes), and `internal/proxy/arch_test.go`
(the job's one call site). This spec's own enforcer is `internal/auth/arch_test.go`, which already
holds AC9 and now also asserts that no package under `internal/auth/**` reads the replay marker,
so no authorization decision on any request can turn on it (AC36).

It is safe on three properties, each of which the enforcers above hold:

- **No principal and no credential.** The replay carries neither, and the queue that runs the
  `proxy.revalidate` job gives no job a principal in the first place (`async-operations.md`
  AC30), so this spec's authorizer has nothing to decide: it is not an anonymous request (the anonymous rule of "Visibility and the
  anonymous principal" is never applied to it), nothing it causes is attributed to an identity,
  and there is no scope to widen. The upstream credential its fetch presents is the remote's own
  (`upstream-adapters.md`), the one a direct client's fetch through the same remote would present.
- **Nothing returned to any caller.** The response is discarded. Its only lasting effect is an
  adoption into the remote's cache, the same effect a direct client's fetch would have, and every
  byte of that cache reaches anyone only through a later request that the router authorizes on the
  remote, or on a virtual whose membership an administrator configured.
- **One asserted call site, one recipient, a fixed input.** The job's only argument is the remote;
  the routes it replays are the ones recorded with each cached entry at its first fetch or, for a
  never-adopted remote, the member-input paths the format's generator profile declares
  (`signing-service.md`'s `Profile`), never a value taken from a request; and each replay is a
  `GET` on that remote's document route.

**What would make it unsafe**, each of which is therefore a change to this section, to AC36 and to
AC10's review list, never an implementation detail: a second recipient of the entry or a second
call site (any code path could then read private content below the authorizer); a route,
repository or method chosen by a request rather than recorded or declared (a client could steer
an unauthorized dispatch); a method other than `GET`, or a `local` or `virtual` target (a write,
or a read of content that is not an upstream's); any part of the replayed response copied to a
caller, a log line, an error body or a job result (a read without authorization); a principal or
credential attached to the replay (something it causes would then be authorized or attributed as
someone); or a handler branching on the marker, or the authorizer reading it (a marker that changes
behaviour is a credential nobody verifies). The entry, its call site and its marker sit on AC10's
external review surface for that reason.

### Scope vocabulary

A scope is `(repository, action)` where action is one of **`pull`, `push`, `delete`** - OCI's own
vocabulary, used for every format. The scope unit was chosen because it needs no translation from
OCI's grammar, and inventing a second vocabulary would reintroduce exactly that translation layer
at the token-service boundary.

Accepted cost: the words read as container-flavoured to a Maven or PyPI user, and `pull` is an
odd verb for a package download. That is a documentation problem rather than a security one.

**Management operations add no action.** The format specs that settled hosted management
operations on 2026-09-26 map each onto this vocabulary, evaluated against the operation's
addressed object like any other route: removal-class operations require `delete` (PyPI yank,
unyank, file deletion and release deletion; Cargo yank and unyank; npm unpublish of a version or
a package; Galaxy version and collection deletion) and metadata changes require `push` (npm
deprecate and undeprecate), so a pattern-scoped grant manages only inside its pattern. A
proposal for a `manage` or `yank` action is a change to this vocabulary, landing in human grants
and token scopes at once. **One operation carries one authorization rule whatever wire it
arrives over.** Where a client has a native command for a management operation, that route is a
binding onto the registry-owned operation in `foundation/management-api.md` and inherits its
action: Cargo's `cargo yank` and `cargo yank --undo` routes are bindings onto the management
API's yank operation and require `delete` exactly as PyPI's yank does (`formats/cargo.md`, the
resolved yank-binding decision, was Q6), so a Cargo publisher holding `push` alone publishes but
cannot yank. The divergence an earlier pass recorded here, Cargo yank under `push`, was settled
from the Cargo side and no longer exists.

**The reconciliation across all formats is `management-api.md`'s** ("Cross-format
reconciliation", its kind table), and this spec cites it rather than repeating it: every
operation is one of that spec's kinds, and each kind carries one action. The removal class
(`withdraw`, `restore`, `delete-version`, `delete-package`, `delete-file`, `prune`) requires
`delete`, so NuGet's unlist and relist and conda's revoke and unrevoke join it, both formats
having recorded their own `push` reading as an input to that reconciliation and not a decision
over it (the resolved withdraw-action decision there, was Q1). The metadata class (`annotate`,
`attach`, `detach`) requires `push`, so Hex's retire, conda's patch and notices and NuGet's
deprecate join npm's. `publish` requires `push` on the object the write names. `configure` and
`rebind` are admin-only where they touch keys or ownership. Two more things live there and are
only named here so the vocabulary reads as complete: **human-grant administration** (create,
list, revoke a grant) is admin-only under AC28, and **pointer management** requires `push` to
create or repoint a pointer and `delete` to delete one, both with the object none, so only an
unpatterned grant promotes (the resolved pointer-action decision there, was Q6). No format may
add an action outside that table.

### Pattern scopes

Per the 2026-09-23 scope decision, **path and tag patterns layer on that base unit**, and per
the resolved pattern-evaluation decision below they narrow **within** one repository: a scope is
`(repository, action)` plus an optional pattern over the objects inside that repository. A
pattern never ranges over repository names, so the identity-binding rule above holds without an
exception, and a fleet-style grant over `prod-*` repositories is not expressible.

**What the authorizer matches against.** Beside the repository and action, the pinned `Scope`
type carries the object the request addresses, which the handler reports because only the
handler can parse its URL grammar. The object has one of four kinds:

| Kind | Meaning | Example routes |
|---|---|---|
| named | the handler's canonical name for the finest named thing the route addresses | a generic artifact path; an OCI manifest by tag, `{image}/{tag}`; an npm package name |
| content-addressed | the route reads or writes content identified by digest, or an upload bound to a digest when it commits | an OCI blob, a manifest by digest, an upload session |
| descriptor | the route serves a repository-wide document whose body carries no name, version or digest of any object the repository holds: protocol configuration, a discovery probe, a signing-key document, an index of metadata files named by checksum and type | Cargo's `config.json`; Conan's capability probe; RPM's `repomd.xml`, its signature and key document; zypper's `media.1/media`; Debian's `InRelease` and `signing-key.asc`; OCI's `GET /v2/`, which names no repository at all |
| none | the route addresses the repository as a whole and its response can name objects, including every route that enumerates names | a generic listing; an OCI tag list or catalog; Helm's `index.yaml`; RPM's `primary`; Chef's universe; every LuaRocks manifest |

The descriptor kind exists for one reason (the resolved name-free-document decision below, was
Q23): several clients open every command with a repository-wide document that reveals nothing,
and under three kinds that document had to be none, so a credential holding only a patterned
`pull` could not run the client at all. A handler may report a route as a descriptor only when
the sentinel test in "The mechanical catch" below holds for it; a document that names even one
package is none.

Which object each route reports is format knowledge, declared in each format's spec alongside
its route-to-scope mapping; this spec fixes only the kinds and how they evaluate. Two
consumers show the shape a declaration takes:

- **Galaxy** (`formats/ansible-collections.md`, "Namespaces") reports `{namespace}/{name}` for
  the collection detail and version list, `{namespace}/{name}/{version}` for the version detail
  and artifact download, and the same for a publish, taking the object from the multipart file
  part's declared filename, which precedes the artifact bytes, and refusing an artifact whose
  `collection_info` disagrees with it so a mislabelled part cannot evade the pattern. An import
  poll reports the object of the publish its task records, and discovery reports a descriptor,
  since its available-versions document names API versions and nothing the repository holds
  (`formats/ansible-collections.md`, "Namespaces"). A namespace is therefore granted by a
  pattern such as `alpha/**`.
- **Cargo** (`formats/cargo.md`, "Addressed objects and pattern scopes") canonicalises the
  crate name to the **folded key** its model stores, lowercase with `_` replaced by `-`, never
  the registered spelling, because a pattern matches byte for byte and the folded key is
  computable from every spelling any route carries, so `acme-*` covers `Acme_Tool` however a
  request spells it. It reports `{crate}` for the crate's index file and the owners routes,
  `{crate}/{version}` for the download, the publish (from the metadata JSON that precedes the
  `.crate` bytes, refusing an archive whose manifest disagrees), and yank and unyank; `config.json`
  is a descriptor, and search is none.
- **The name-free documents** every client reads first are descriptors, not none: Cargo's
  `config.json`, Conan's capability probe and user routes, RPM's `repomd.xml` with its signature
  and key document, and zypper's `media.1/media` and `content` probes. Each format declares its
  own in its spec; further examples are Debian's `InRelease`, `Release`, `Release.gpg` and
  `signing-key.asc` (the envelope names index files by path and digest, never a package),
  Terraform's `/.well-known/terraform.json`, Hex's `public_key`, `installs/hex-1.x.csv` and its
  identity routes `api/users/me` and `api/auth`, LuaRocks' `api/tool_version`, Composer's
  `packages.json` on a remote (rendered with no package list), Galaxy's discovery, NuGet's service
  index, Swift's `availability` and login routes, and OCI's `GET /v2/`. The enumerating indexes
  stay none: Helm's `index.yaml` lists every version of every chart, RPM's `primary` every
  package in the tree, Debian's `Packages` and `Sources` (by path or by hash) every package of a
  component, Chef's universe and every LuaRocks manifest every name, so a patterned `pull` is
  refused them and helm, dnf, zypper, apt, Berkshelf, chef-cli and luarocks do not resolve under a
  patterned-only `pull` on those formats (the resolved name-free-document decision below, was
  Q23).

**How a patterned scope evaluates** (the resolved requests-naming-no-object decision below). A
scope with no pattern authorizes its action on every request to its repository, whatever the
kind. A scope with a pattern authorizes:

- a **named** object only when the name matches the pattern;
- a **content-addressed** object for `pull` and `push`, and never for `delete`;
- a **descriptor** object for `pull` only, and never for `push` or `delete`;
- a **none** object never.

The descriptor allowance reveals nothing a pattern protects: the credential already holds a
scope on the repository, so the repository's existence and its protocol configuration are not
secrets from it, and a descriptor by definition names no object. It is `pull`-only because the
documents it covers are written by administrators or by management operations that report none,
never by a pattern-narrowed client. What it buys is stated exactly rather than generously: a
token holding only a patterned `pull` runs `cargo fetch` and `cargo add` end to end (the
descriptor `config.json`, then the in-pattern crate's named index file and download), passes
Conan's probe, and reaches RPM's `repomd.xml`; it is still refused Helm's `index.yaml`, RPM's
`primary`, Conan's search and every other enumerating document, so helm, dnf and zypper remain
unrunnable under a patterned-only `pull`, and the standing recipe for those formats stays an
unpatterned `pull` beside a patterned `push` and `delete`.

**A descriptor that names no repository** is authorized by authentication alone. Every other
object is evaluated against a scope on the repository the request addresses; OCI's `GET /v2/`,
the distribution specification's version probe, addresses none, because under
`formats/oci.md`'s name split the repository is the first component of a `<name>` the probe does
not carry. It is declared a descriptor with an empty repository (`formats/oci.md`, "Addressed
objects and pattern scopes"), and the authorizer answers it for **any verified credential**,
whatever repositories, actions and patterns it holds; a credential-less request receives the
format's challenge, and a credential that fails verification is rejected, never anonymous
(AC12). It reveals nothing a scope protects: its body is empty, and whether a credential is
valid is what every `401` already tells its presenter. Only a descriptor may name no
repository; a named, content-addressed or none object reported without one is denied as
unauthorized, the interface's settled failure mode for a request its mapping cannot classify.
AC32 asserts both.

The content-addressed allowance is the accepted cost. Without it a tag-scoped token could not
pull the blobs its own tag references, and a multi-architecture pull resolves child manifests
by digest. On a content-addressed format a pattern therefore narrows what a credential can
**name** - read by tag, write or move a tag - and not the content it can fetch by a digest it
already knows. A patterned `push` may upload content, which stays unreferenced until a named
write the pattern governs refers to it; one residual is not narrowed and is named here rather
than discovered later: a manifest pushed untagged by digest, including an OCI referrer whose
`subject` attaches it to another tag's manifest. `delete` never takes the allowance, because
deleting a manifest by digest removes every tag pointing at it. Name-enumerating routes are
refused outright, because a listing reveals names outside the pattern.

**The grammar** (the resolved pattern-grammar decision below), matched byte for byte against
the handler's canonical object string:

- `/` separates segments. A literal segment matches only itself, case-sensitively. The handler
  canonicalises the object first (a PyPI project name arrives normalised), so a pattern is
  written against the canonical form.
- `*` matches a run of one or more characters within one segment and never crosses `/`. It
  may stand alone or sit inside a segment (`acme.*`, `v1.*`).
- `**` as a whole segment matches zero or more whole segments; anywhere else it is invalid.
- Nothing else is special: no `?`, no character classes, no braces, no escapes, no negation. A
  pattern is validated when the grant or token is created, and an empty pattern, an empty
  segment, or any other syntax is refused there rather than matched loosely later.
- There is no implicit wildcard: `prod` matches only `prod`; `prod/*` matches `prod/x` but
  neither `prod-staging/x`, `prod/x/y` nor `prod` itself; `prod/**` matches `prod`, `prod/x`
  and `prod/x/y`; a pattern naming one tag matches that tag and no other.

**The OCI token service carries the pattern.** A JWT minted from a patterned credential carries
the pattern alongside the distribution spec's `repository:<name>:<actions>` access entry, and
the authorizer evaluates each subsequent request's addressed object against it. Without that
the token endpoint is a pattern-laundering step: the credential is narrow, and the JWT it buys
is repository-wide. The claim's encoding is an implementation decision AC10's review covers.

**The mechanical catch** is the one the route-to-scope mapping already has, extended. A handler
that reports the wrong kind, or a name that is not the canonical one, under-grants or
over-grants silently, so every format's case set carries a pattern-refusal case in both modes,
runner-enforced (`format-handler-interface.md` AC7), and each handler's object reporting is
table-tested per route (`format-handler-interface.md` AC12). The descriptor kind adds the one
misreport a table cannot catch by inspection, an enumerating document labelled a descriptor, so
it carries its own mechanical enforcer, the **sentinel test**: for every route a handler reports
as a descriptor, the per-handler object test seeds the repository with an object whose name,
version and digest are sentinels that occur nowhere else, fetches the route, and fails if any
sentinel appears in the body. The test is the definition of the kind made executable, and a
route that fails it is none (AC32; the interface spec's AC12 table test is where it runs).

### Human grants

Per the resolved human-grant decision below, a human's authorization is a set of grants in the
machine vocabulary, `(principal, repository, action)`, each optionally narrowed by a pattern
exactly as a token scope is, plus the single global **admin** role the bootstrap already
defines. There is no second vocabulary: one evaluator decides for people and tokens alike, and a
person's grant and a token's scope are the same shape.

- A brand-new identity holds no grants (AC14). Each grant is created explicitly and binds the
  repository's identity, so it grants nothing on a recreated repository of the same name.
- Actions are independent, as OCI's are: `push` does not imply `pull`, and `delete` implies
  neither.
- The admin role holds every action on every repository, and it alone creates and revokes
  grants, creates repositories and changes a repository's visibility. The accepted cost is
  that granting a team of ten across ten repositories is a hundred grants with no grouping.
- The anonymous principal holds no grants: anonymous read is a repository's visibility
  setting, evaluated as the visibility section above states.

### What `pull` also authorizes: replication reads

An inbound amendment from `replication.md`, absorbed here as a revision to this vocabulary
rather than left to surprise it. Replication settled instance-to-instance authentication (its
resolved record, was Q6, adopted 2026-09-26 under the owner's standing delegation) as an
ordinary machine token, and that choice widens what `pull` means in this spec:

- **An unpatterned `pull` on a repository also authorizes that repository's replication read
  surface**: the pointer set, retained ranges, snapshot identities, deltas, checkpoints and
  blobs by digest. The action vocabulary stays `pull`/`push`/`delete`; no `replicate` action
  exists, for humans or tokens.
- **A patterned `pull` does not.** A delta exposes every object in the repository, so the
  replication routes evaluate like any other repository-wide route under "Pattern scopes": their
  addressed object is none, which a patterned scope never authorizes.
- The replication routes are not format-handler routes; the replication package declares its
  own route-to-scope mapping, evaluated by this spec's central authorizer, and
  `replication.md` AC18 is the criterion and architecture test that hold it.

The accepted cost is replication's, recorded here because this spec owns the vocabulary: any
pull-scoped CI token can enumerate a repository's snapshot history and read its deltas,
including content a hosted delete removed from the head that the leader still retains for
rollback. An operator who needs download-only authority without that history has no narrower
action to grant; a `replicate` action would be a change to this vocabulary, landing in human
grants and token scopes at once because they share it.

### Tokens are never stored recoverable

Only a SHA-256 hash plus a lookup prefix is persisted; the prefix is the part of
`swr_<lookup prefix><secret>` after the marker ("Nothing is invented"), and it is the `id`
`credential-management.md`'s listing shows, so the string in a CI secret and the row in the
listing match by eye. A token is displayed once at creation and is unrecoverable afterwards.
This is deliberately inconvenient. A registered public key is the one credential this rule does
not need: it is stored whole because it is not secret.

### Configuration

The keys this spec owns, in the one configuration surface `deployment.md` defines (file,
environment, the short flag set), registered under the `auth.` prefix so its two-way schema check
holds this table against the schema. Defaults are this spec's; `deployment.md` carries them
without restating their meaning.

| Key | Default | Meaning |
|---|---|---|
| `auth.oidc.issuer` | none | The OIDC provider's issuer URL. Unset means no provider: the local admin authenticates (AC2). Setting it requires `auth.oidc.client_id` and `auth.oidc.admin_identities` |
| `auth.oidc.client_id` | none | This relying party's client identifier at the provider, the ID token's expected audience (AC20) |
| `auth.oidc.client_secret` | none, **secret** | The client secret for the Authorization Code exchange; accepts `auth.oidc.client_secret_file`; never a flag |
| `auth.oidc.redirect_url` | `{public URL}/ui/auth/callback` | The redirect URI registered at the provider, derived from the public URL unless set |
| `auth.oidc.admin_identities` | none | A list of `{issuer, subject}` pairs that hold the admin role. At least one is required whenever `auth.oidc.issuer` is set, or startup is refused (AC13) |
| `auth.local_admin.keep` | `false` | Keeps the local admin account usable after OIDC is configured (the resolved break-glass decision, was Q1; AC2) |
| `auth.session.lifetime` | `24h` | Absolute lifetime of a browser session from issue; logout invalidates earlier (AC22) |
| `auth.allow_plaintext` | `false` | Accept credentials over a connection the server did not terminate with TLS; the behind-a-terminating-proxy declaration. Flag `--allow-plaintext-auth` (AC27) |
| `auth.token_service.lifetime` | `5m` | Lifetime of the token service's two products, the OCI JWT and the download capability, which is also their revocation window (AC5, AC33). A value above `15m` is refused at startup, because the window is the exposure |

The token service's signing key is not a configuration key: its provenance and storage are the
implementation decisions AC10's review covers, and it is never a flag. The pattern grammar and
the scope vocabulary are not configurable. Token lifetimes and the expiry warning window are
`credentials.*` keys owned by `credential-management.md`.

## Acceptance Criteria

- [ ] AC1: A user authenticates through any compliant OIDC provider, demonstrated against at
      least two different providers, with no provider-specific code on the path.
- [ ] AC2: With no OIDC configured, the local admin account authenticates and the server is
      fully usable; the account cannot be used once OIDC is configured unless explicitly kept.
- [ ] AC3: `docker login --password-stdin` succeeds against the OCI token flow with a registry
      token as the Basic password and any username, the token endpoint's responses carry no
      refresh token, and a token scoped to one repository **cannot** read another, asserted by
      a conformance case that expects denial.
- [ ] AC4: `npm`, `pip` and `mvn` each authenticate using the credential form that client
      natively sends, proven by conformance cases running the real clients.
- [ ] AC5: A revoked credential is rejected on the next request on every path except an
      already-issued OCI token, which remains valid until its expiry. That window is bounded by
      the configured token lifetime, is measured in minutes, and is asserted by a test that
      revokes a credential and shows the OCI token failing once expired and no later.
- [ ] AC6: Tokens are stored only as a SHA-256 hash plus a lookup prefix, compared in constant
      time; a database dump yields no usable credential, asserted by a test that reads the row
      and fails to authenticate with it; and an issued token has the shape
      `swr_<lookup prefix><secret>`, base32 without padding, with the prefix equal to the row's
      lookup prefix and the secret carrying at least 256 bits from `crypto/rand`.
- [ ] AC7: Every log line, error response, metric label, span attribute and audit record the
      server emits is free of any token, password, capability or signature header value and of
      its hash preimage, asserted by an integration test that
      exercises both a real failed authentication and a real successful one **in every
      presentation form the Design table lists** (header, Basic, query parameter, each path
      segment, the capability, Chef's signed headers) and scans the emitted output of each - a
      request logger that echoes Authorization material or the request path leaks on the success
      path, which a failed-path-only scan never sees; a registry token carried in a query
      parameter that is no form (Vagrant's `access_token`) is answered as a credential-less
      request and is absent from the same output; and the verifier calls
      `telemetry.MarkSecret` on every extracted credential before any other use, asserted by a
      test that fails when a form's extraction skips the call. The single exception is the
      first-start local admin credential (AC15), emitted through `telemetry.Disclose` from its
      one call site; the test asserts that exactly one such emission occurs and that nothing
      else leaks.
- [ ] AC8: Every format's conformance case set contains an unauthenticated, an unauthorized and
      a pattern-refusal case (a token patterned to one named object refused on another) in both
      modes (honouring a declared unsupported mode per `Capabilities()`), runner-enforced, and a
      format missing any of them fails the suite - the same contract
      `format-handler-interface.md` AC7 and the harness's case-set validation state.
- [ ] AC9: No package under `internal/auth/**` implements a cryptographic primitive; verified by
      an architecture test asserting the allowed library set.
- [ ] AC13: Setting `auth.oidc.issuer` and `auth.oidc.client_id` without at least one entry in
      `auth.oidc.admin_identities` is refused at startup with a message naming the missing key,
      and after a successful OIDC configuration that named identity can administer the registry
      while the local admin no longer authenticates unless `auth.local_admin.keep` is set.
- [ ] AC14: A brand-new identity from the provider authenticates successfully and can perform no
      action on any repository until explicitly granted; once the admin grants it `pull` on one
      repository it can pull there and nothing else - not push there, and not pull elsewhere.
- [ ] AC15: The local admin credential is generated from `crypto/rand` at first start, appears in
      the log exactly once, and is stored only as a hash; a second start does not re-emit it.
- [ ] AC16: A token created without an explicit non-expiring opt-in has an expiry, and is
      rejected after it passes; a non-expiring token requires the deliberate flag.
- [ ] AC17: A request for a private repository from a caller without read access is
      indistinguishable from a request for a repository that does not exist, including status
      code, body and timing-insensitive headers; and a credential-less request to either answers
      `401` carrying the `WWW-Authenticate` challenge the format declares, byte-identical for the
      two, so a client that sends nothing until challenged (zypper, pak, NuGet, cabal 3.16)
      proceeds on a private repository it holds a credential for.
- [ ] AC18: A handler's declared route-to-scope mapping is what the shared layer enforces; a
      handler whose mapping omits a route fails its unauthenticated and unauthorized conformance
      cases.
- [ ] AC19: A scope narrowed by a pattern authorizes a named object only when the object matches
      under the grammar in Design, with no implicit wildcard, for token scopes and human grants
      alike and in both modes on every format with named-object routes: `prod/*` is accepted
      for `prod/x` and refused for `prod-staging/x`, `prod/x/y` and `prod`; `prod/**` is
      accepted for `prod/x/y`; `acme.*` is accepted for `acme.tools` and refused for
      `acmex.tools`; and a scope naming one tag is refused for every other tag.
- [ ] AC10: An external security review of the implementation is recorded as complete before any
      auth code reaches `main`.
- [ ] AC11: A newly created repository rejects unauthenticated reads; after anonymous read is
      explicitly enabled on that repository, an unauthenticated GET succeeds there and remains
      rejected on every other repository.
- [ ] AC12: A request bearing an invalid, expired or revoked credential is rejected with an
      authentication error and is never treated as anonymous, including against a repository
      with anonymous read enabled.
- [ ] AC20: An OIDC callback whose `state` does not match an initiated flow, whose `nonce` does
      not match, whose PKCE verifier fails, or whose ID token fails signature, issuer, audience
      or expiry validation is rejected with no session issued - asserted by integration tests
      that tamper with each binding individually.
- [ ] AC21: The local principal is keyed on `(issuer, subject)` alone: a changed email claim on
      an unchanged `(issuer, subject)` resolves to the same principal with its grants intact,
      and an identical email claim arriving from a different `(issuer, subject)` resolves to a
      distinct principal holding no grants.
- [ ] AC22: A completed `/ui/auth/callback` issues the session cookie with HttpOnly, Secure,
      `SameSite=Lax` and `Path=/` and the `stackweaver_csrf` cookie bound to the session; a
      `POST`, `PUT`, `PATCH` or `DELETE` UI request whose `X-CSRF-Token` is absent or does not
      match that cookie is refused `unauthenticated` and changes nothing; `GET /api/v1/session`
      answers the signed-in principal with a valid cookie and, without one, `200` with
      `principal_kind: anonymous` and no grants (`management-api.md` AC28), while an invalid or
      expired cookie on it is refused `unauthenticated`, never answered as anonymous; the session
      expires at `auth.session.lifetime` from issue; and `/ui/auth/logout` invalidates the
      session server-side, after which the old cookie no longer authenticates.
- [ ] AC23: The OCI token service rejects a token whose header names any algorithm other than
      the configured one, including `none`, regardless of its signature; and a signing-key
      rotation leaves already-issued tokens verifiable via `kid` until their expiry while new
      tokens are signed with the new key, with no failed pull across the rotation.
- [ ] AC24: A patterned scope authorizes content-addressed requests for `pull` and `push`,
      refuses them for `delete`, and refuses every request whose addressed object is none: a
      token scoped to one OCI tag pulls that tag, including its blobs and, for a
      multi-architecture index, its child manifests by digest; with `delete` it cannot delete a
      manifest by digest; it cannot list the repository's tags; and a patterned generic token
      cannot list.
- [ ] AC25: Creating a grant or token whose pattern falls outside the grammar is refused at
      creation - an empty pattern, an empty segment, `**` inside a segment, or any of `?`, `[`,
      `{`, `\` or `!` - and a pattern is stored only beneath its scope's single repository
      identity, so no accepted pattern authorizes anything in another repository.
- [ ] AC26: A patterned credential exchanged at the OCI token endpoint yields a JWT refused
      outside the pattern exactly as the credential is; and a token request naming scopes the
      credential does not hold, including scopes on another repository, is answered with a JWT
      carrying only the credential's own scopes.
- [ ] AC27: With the plaintext flag unset, a request presenting a credential in **any form the
      Design table lists** (each `Authorization` scheme, each vendor header, the `token` query
      parameter, the root path token, the LuaRocks key segment, the Open VSX read segment, a
      download capability, Chef's signed headers) over a connection the server did not terminate
      with TLS is refused with an error stating that credentials require TLS, identically for a
      valid and an invalid credential, without the credential being looked up, verified or
      logged, and never answered as anonymous; an `X-Forwarded-Proto: https` header does not
      change the outcome. With the flag set the same request authenticates normally, and a
      request presenting no credential is unaffected either way.
- [ ] AC28: Human authorization uses the machine vocabulary: an identity granted only `push` on
      a repository can push there but not pull, and holds nothing on any other repository; a
      grant on a repository grants nothing on a recreated repository of the same name; and
      creating or revoking a grant, creating a repository, or changing a repository's
      visibility succeeds for the admin role and is refused for every other principal, whatever
      repository grants it holds.
- [ ] AC29: Creating a token with scopes on two repositories is refused unless the explicit
      multi-repository opt-in is set; with it, the token is accepted only when every repository
      is named by identity (a pattern or wildcard over repositories is refused), it is honoured
      on each named repository, including a cross-repository mount from one to the other, and
      it is refused on every repository not named; a token carrying several actions on one
      repository is accepted without the opt-in and each of its actions is honoured.
- [ ] AC30: A token's authority never exceeds its owner's: creating a token with a scope its
      owning principal does not hold is refused; after the owner's grant is revoked, the
      token's matching scope is refused on the next request on every path except an
      already-issued OCI JWT, which fails once expired and no later; and no token, including
      one owned by the admin, can perform an administrative action.
- [ ] AC31: One registry token authenticates as the same principal with the same scopes in
      every form the Design table lists: as `Authorization: Bearer <token>`, as the Basic
      password with any username, as `Authorization: Token <token>`, as a scheme-less
      `Authorization: <token>`, as `Authorization: X-ApiKey <token>`, as `X-NuGet-ApiKey` on a
      NuGet `PackagePublish` route, as `X-Jfrog-Art-Api` on a Chef read route, as
      `X-OpenVSX-Token` and as the `token` query parameter on an Open VSX write route, as the
      root path token `/t/{token}/` on any route of any format, as the `api/1/{key}/` segment on a
      LuaRocks upload route, and as the `-/t/{token}/` segment on an Open VSX read route when it
      holds `pull` alone. An `Authorization` value in none of these forms or naming an unknown
      scheme, a route-scoped form presented on a route that does not accept it, a `push`- or
      `delete`-holding token in the Open VSX read segment, and a request carrying two forms of
      which either fails, are each rejected with an authentication error and never treated as
      anonymous, including on a repository with anonymous read enabled; a request carrying two
      forms that both verify holds the intersection of their authority.
- [ ] AC32: A patterned scope authorizes a descriptor object for `pull` and refuses it for `push`
      and `delete`; a token holding only `pull` patterned to one crate completes a real
      `cargo fetch` against a hosted and a proxied repository (`config.json`, the in-pattern
      crate's index file and download) and is refused another crate's index file; the same
      token is refused Helm's `index.yaml` and RPM's `primary`, so `helm repo add` and a dnf
      refresh fail under it; and for every route a handler reports as a descriptor, the
      sentinel test finds no seeded object name, version or digest in the response body, a
      route with any sentinel present failing the handler's object table; and a descriptor
      reported with no repository (OCI's `GET /v2/`) is authorized for any verified credential
      whatever its scopes, a token holding only a patterned `pull` on one repository included,
      answers a credential-less request with the format's challenge and rejects a failing
      credential with an authentication error, never anonymous, while a named,
      content-addressed or none object reported with no repository is denied as unauthorized.
- [ ] AC33: A download capability minted for an authenticated Terraform metadata response is
      signed with the token service's configured algorithm and `kid`-selected key, carries the
      repository, `pull`, the principal and the exact object of the byte route, never a scope or
      object outside the minting request's own pattern-narrowed scope, and fetches that object's
      bytes on a private repository; the same capability on another version's bytes, another
      repository, after `auth.token_service.lifetime` has passed, or with one byte altered is
      refused `401` at the start of the request and never served as anonymous; revoking the
      minting credential stops new metadata responses on the next request while an
      already-minted capability works until its expiry and no later, on an injected clock; a
      credential-less request on an anonymously readable repository receives byte URLs with no
      capability segment; and no capability value appears in any log line, span, metric, error
      body or audit record.
- [ ] AC34: A `knife supermarket share` signed with the private key matching a registered public
      key and naming it in `X-Ops-Userid` succeeds against a hosted repository when the key's
      scopes authorize `push` on the object the tarball part's filename names, under protocols
      1.0, 1.1 and 1.3 alike; the same request is refused with an authentication error, never
      anonymous, when the signature fails over the canonical string, when any signed header is
      altered, when `X-Ops-Timestamp` is more than 15 minutes from the server clock, when the
      key is expired or revoked, when the sign description is none of the three accepted, and
      when `X-Ops-Content-Hash` differs from the digest of the tarball part, the last of these
      aborting the write before commit and leaving no version behind; and no verifier code
      outside the standard library's `crypto/rsa` and `crypto/sha*` performs the signature check,
      asserted by AC9's architecture test.
- [ ] AC35: A route a handler declares as an exchange-echo route (Conan's
      `/v2/users/authenticate` and `/v1/users/authenticate`) is answered by the shared layer and
      never reaches the handler: a registry token presented as the Basic password with any
      username, holding `pull` on the repository with or without a pattern, receives `200`,
      `Content-Type: text/plain`, `Cache-Control: no-store` and a body equal to the presented
      token, which the real Conan client then presents as Bearer; an invalid, expired or revoked
      token is refused `401` with an authentication error, never anonymous, and no body carries
      its value; a valid token lacking `pull` receives the existence rule's `404`; a test
      handler registered for the route fails if it is ever invoked; and the echoed value appears
      in no log line, span attribute, metric label, error body or audit record.
- [ ] AC36: The revalidation replay entry (`format-handler-interface.md` AC18, `proxy-cache.md`
      AC26) is the only way into a handler that does not pass this spec's authorizer, and it
      stays inside the three properties Design names: a replayed request carries no principal and
      no credential, is a `GET` on a `remote` repository's recorded or profile-declared route
      (the entry refuses any other method and any `local` or `virtual` repository before
      dispatch), and its response reaches no caller; the replay marker is a context value only
      the entry sets, so no request arriving through the router carries it, whatever its headers,
      query or path; no package under `internal/auth/**` references the marker, so no
      authorization decision depends on it; and every request through the router, including one
      for a route the replay also serves, is authorized exactly as AC18 and AC17 require.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/auth/oidc_test.go` (two providers in containers) |
| AC2 | integration | `internal/auth/local_test.go` |
| AC3 | conformance | `conformance/oci/auth_test.go` (`docker login --password-stdin` with a registry token, token-endpoint response inspected for a refresh token, cross-repository denial) |
| AC4 | conformance | `conformance/<format>/auth_test.go` |
| AC5 | integration | `internal/auth/revocation_test.go` |
| AC6 | unit | `internal/auth/token_test.go` |
| AC7 | integration + unit | `internal/auth/leak_test.go` (a failed and a successful authentication per presentation form, scanning log lines, error bodies, metric labels, span attributes and audit records, plus a request carrying Vagrant's non-form `?access_token=`, answered credential-less and scanned the same way; shared with `observability.md` AC9); `internal/auth/credential_form_test.go` (every extractor marks its value with `telemetry.MarkSecret` before use); the `telemetry.Disclose` single-call-site walk is `observability.md` AC10's |
| AC8 | unit | `conformance/core/case_validate_test.go` |
| AC9 | architecture test | `internal/auth/arch_test.go` |
| AC10 | manual | recorded in this spec's Review Log; procedure below |
| AC11 | integration | `internal/auth/visibility_test.go` |
| AC12 | integration | `internal/auth/visibility_test.go` |
| AC13 | integration | `internal/auth/bootstrap_test.go` |
| AC14 | integration | `internal/auth/default_grant_test.go` |
| AC15 | integration | `internal/auth/local_admin_test.go` |
| AC16 | integration | `internal/auth/expiry_test.go` |
| AC17 | conformance | `conformance/core/existence_oracle_test.go` (private versus missing, credentialed and credential-less, the `WWW-Authenticate` value compared byte for byte per format) |
| AC18 | unit + conformance | `internal/auth/scope_map_test.go`; per-format cases via `format-handler-interface.md` AC7 |
| AC19 | unit + conformance | `internal/auth/pattern_test.go` (the matcher, with a `FuzzPatternMatch` target asserting a wildcard-free pattern matches only itself and `*` never matches across `/`); per-format pattern-refusal cases in both modes via `format-handler-interface.md` AC7 |
| AC20 | integration | `internal/auth/oidc_test.go` (per-binding tamper cases) |
| AC21 | integration | `internal/auth/principal_test.go` |
| AC22 | integration | `internal/auth/session_test.go` (cookie attributes, `stackweaver_csrf` issue, mismatched and absent `X-CSRF-Token`, `GET /api/v1/session` with a valid cookie, with none (`200`, `principal_kind: anonymous`, shared with `management-api.md` AC28's `internal/manage/reads_test.go`) and with an expired one (`unauthenticated`), expiry under an injected clock, logout) |
| AC23 | integration | `internal/auth/token_service_test.go` (algorithm confusion; mid-flight key rotation) |
| AC24 | unit + conformance | `internal/auth/pattern_test.go` (evaluation per object kind and action); `conformance/oci/auth_test.go` (tag-scoped pull of a multi-architecture index; refused digest delete and tag list); `conformance/generic/auth_test.go` (refused listing) |
| AC25 | unit | `internal/auth/pattern_test.go` (validation table over each refused form) |
| AC26 | integration | `internal/auth/token_service_test.go` (patterned exchange; multi-repository token request) |
| AC27 | integration | `internal/auth/plaintext_test.go` (flag unset and set, valid and invalid credential in each presentation form of the Design table, spoofed forwarding header, no-credential request) |
| AC28 | integration | `internal/auth/grant_test.go` |
| AC29 | integration | `internal/auth/token_scope_test.go` (single-repository default, refused and accepted multi-repository creation, unnamed repository refused); the cross-repository mount under an opt-in token is also exercised by `formats/oci.md` AC1's suite run |
| AC30 | integration | `internal/auth/token_owner_test.go` |
| AC31 | unit + integration + conformance | `internal/auth/credential_form_test.go` (every form of the Design table resolving identically; unknown schemes, malformed values, off-route presentations and a write-capable token in the Open VSX read segment rejected, never anonymous; two forms on one request); the real clients per form in `conformance/nuget/auth_test.go` (`formats/nuget.md` AC10, both headers on a challenged push), `conformance/chef/auth_test.go` (`X-Jfrog-Art-Api`), `conformance/openvsx/auth_test.go` (`formats/openvsx.md` AC9), `conformance/conda/auth_test.go` (`formats/conda.md` AC8, the root path token), `conformance/luarocks/auth_test.go` (`formats/luarocks.md` AC5 and AC8) and `conformance/hackage/auth_test.go` (`formats/hackage.md` AC20) |
| AC32 | unit + conformance | `internal/auth/pattern_test.go` (descriptor evaluation per action); `conformance/cargo/auth_test.go` (patterned-only `pull` running `cargo fetch` in both modes, refused another crate's index file; `formats/cargo.md` AC17); `conformance/helm/auth_test.go` and `conformance/rpm/pattern_test.go` (patterned-only `pull` refused `index.yaml` and `primary`; `formats/helm.md` AC16, `formats/rpm.md` AC14); the sentinel test in each handler's `internal/format/<name>/scope_object_test.go` through the shared helper `format-handler-interface.md` AC12 names; `internal/auth/pattern_test.go` (a repository-less descriptor under a verified, a patterned, a failing and an absent credential; a repository-less object of each other kind denied); `conformance/oci/auth_test.go` (a patterned-only `pull` passing the `GET /v2/` probe with the real `docker`; `formats/oci.md` AC11) |
| AC33 | integration + conformance | `internal/auth/capability_test.go` (claims, foreign object and repository, expiry and revocation under an injected clock, tampered value, anonymous-readable omission; the file `formats/terraform.md` AC4 names); `internal/auth/leak_test.go` (URL redaction); `conformance/terraform/capability_test.go` (the four real clients; `formats/terraform.md` AC4) |
| AC34 | integration + conformance | `internal/auth/signed_request_test.go` (captured knife requests replayed under each protocol; each altered header, clock skew, expired and revoked key, unknown sign description, mismatched content hash aborting before commit); `internal/auth/arch_test.go` (AC9's allowed set covers the verifier); `conformance/chef/auth_test.go` (real `knife supermarket share` and `unshare`; `formats/chef.md` AC6) |
| AC35 | integration + conformance | `internal/auth/exchange_echo_test.go` (valid, patterned, invalid, expired, revoked and `pull`-less tokens on both routes; response headers and body; a handler registered for the route that fails if invoked); `internal/auth/leak_test.go` (the echoed value scanned for, as AC7 does per form); `conformance/conan/auth_test.go` (the real Conan 2.32.0, 2.0.17 and 1.66.0 exchange followed by Bearer requests; `formats/conan.md` AC14) |
| AC36 | architecture test + unit + integration | `internal/auth/arch_test.go` (no package under `internal/auth/**` references the replay marker, beside AC9's allowed-library assertion); `internal/server/replay_entry_test.go`, shared with `format-handler-interface.md` AC18 (no principal and no credential on the replayed request; a non-`GET` method and a `local` and a `virtual` repository refused before dispatch, cases reported to that spec; a wire request carrying a header, query parameter or path segment named like the marker reaches the handler without it; a fixture route denied through the router and served through the entry); `internal/server/arch_test.go`, shared with the same AC18 (one constructor, one recipient); `internal/proxy/arch_test.go` and `internal/proxy/revalidate_job_test.go`, shared with `proxy-cache.md` AC26 (the single call site; the discarding writer, so no replayed byte reaches a caller, also shared with `async-operations.md` AC30); the queue's half of "no principal", that no job's context carries one, is `async-operations.md` AC30's `internal/async/kinds_test.go` |

**AC10 procedure**: before the first auth code merges, a security review is performed by a party
other than the implementing agent, covering token lifecycle, scope enforcement, the OIDC
validation path and the OCI token service. The reviewer, date and outcome are recorded in the
Review Log. A spec-level review does not satisfy this; it reviews the implementation. **The
review's scope is every surface that verifies, mints or handles a credential, and every entry
into a handler that bypasses the authorizer**, and the sibling specs each placed part of theirs
inside it by name, so the reviewer's list is recorded here rather than left to be assembled
later. A listed surface whose code lands after that first review (the replay entry, which lands
with `proxy-cache.md`'s `proxy.revalidate` job) is reviewed the same way before it reaches
`main`, and recorded the same way:

- this spec's: the token store and constant-time lookup, every presentation form in the Design
  table with its extraction, redaction and plaintext refusal, the route-scoping declarations,
  the OCI token service's claim set, pattern-claim encoding, key provenance and storage, the
  download capability, the OIDC relying-party flow and session, the pattern matcher and the
  repository-less descriptor rule, Conan's exchange-echo route (the one response that carries a
  presented credential back), the redaction of Vagrant's non-form `access_token` parameter, and
  Chef's canonical-string construction and signature check;
- `credential-management.md`'s: the token surface's display-once path, robot accounts, the
  registered public-key store, and the OIDC token exchange (`/api/v1/tokens/exchange`), which
  grows the auth surface with a second OIDC verification path and is off OCI's critical path but
  not off this review's;
- `signing-service.md`'s: the key custody backends (`file`, `kms`, `pkcs11`, `external`) and the
  key routes under `/api/v1/repositories/{name}/signing-keys`, auth-adjacent because they hold
  and operate private material under admin authority;
- `upstream-adapters.md`'s: the upstream credential kinds (Basic, Bearer, vendor header, path
  token, the Conan-shaped `basic-exchange` that trades a stored Basic pair for a `text/plain`
  token presented as Bearer (the resolved Conan-exchange decision there, was Q8, AC33), token
  exchange, AWS ECR and Google Cloud IAM material) and its redactor, auth-adjacent because they
  are the registry's outward secrets;
- `format-handler-interface.md`'s and `proxy-cache.md`'s: the **revalidation replay entry**, the
  one way into a handler that does not pass the shared authorizer (the resolved replay-entry
  decision there, was Q11, AC18; the resolved revalidation-replay decision in `proxy-cache.md`,
  was Q18, AC26): its construction in the composition root, its sole recipient `internal/proxy`
  and the `proxy.revalidate` job's single call site, the replay marker and every place that could
  read it, the source of each replayed route (recorded at first fetch or declared by the generator
  profile, never a request), the `GET`-on-a-`remote` bound, and the discarding writer. The
  reviewer checks the implementation against the unsafe conditions Design lists ("The one entry
  that skips the authorizer") and against AC36. This entry is inside the review because it
  bypasses authorization, not because it handles a credential, and it is added here, not
  exempted: the review covers it with the same force as every surface above.

Adding to this list is free; removing from it is a change to this criterion.

## Implementation Phases

### Phase 1: Machine identity
Token model, one-way storage (per Q4's answer), single-repository scopes (several
repositories only by the explicit opt-in) with optional patterns validated against the grammar,
the owner-intersection rule, revocation, the `swr_` token shape, every presentation form in the
Design table with its route-scoping declaration, `telemetry.MarkSecret` on extraction and the
plaintext refusal on every credential path (AC7, AC27, AC31), the uniform challenge (AC17), the
signed-request verifier for registered public keys (AC34), and the exchange-echo route (AC35),
which lands with `formats/conan.md`. Ported from Stackweaver's
`apikey` service. The universal `Authorization` forms land with `generic`; each route-scoped
form lands with the format that needs it, since its conformance case is that format's.

### Phase 2: Human identity
OIDC client, the `/ui/auth/*` routes, local admin fallback, session issuance with the
double-submit CSRF cookie and `GET /api/v1/session`, human grants and the admin role, the
`auth.*` configuration table.

### Phase 3: The token service
Challenge, token endpoint, scoped JWTs carrying any pattern, subset grants for multi-repository
requests, gated by the official conformance suite; then the download capability as the second
product (AC33), landing with `formats/terraform.md`.

### Phase 4: Enforcement
Central authorization over the four addressed-object kinds, including the descriptor's
`pull`-only allowance and the sentinel test behind it and the repository-less descriptor
authorized by authentication alone (AC32), the runner-enforced per-format auth and
pattern-refusal cases, architecture tests, including the marker assertion that keeps the
revalidation replay entry outside every authorization decision (AC36), which lands with
`proxy-cache.md`'s `proxy.revalidate` job and `format-handler-interface.md`'s replay entry.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None remain open. Q13 through Q17 were raised by the 2026-09-24 gate review and adopted on
2026-09-26 under the owner's standing delegation, together with Q18 through Q22, raised and
adopted in the same pass: Q18 to Q20 because folding exposed them, Q21 and Q22 because sibling
adoptions in `formats/oci.md` landed on this spec that day. Q23 was raised by the format-side
reconciliation (cargo, helm, rpm and conan each found that a patterned-only `pull` could not run
their client) and adopted 2026-09-27; Q24 was raised by the foundation-wave reconciliation of
the same day, when eleven format specs' presentation forms were consolidated into one table and
the off-route rule had to be one rule; Q25 was raised by the closing reconciliation sweep of
2026-09-28, when the `conan` client row showed a response that returns the presented credential,
and was adopted on Opus, so it awaits a Fable recheck; each adopted record opens by saying so, and
the owner may reverse any of them. Q1 through Q12 are all resolved (Q1-Q3 on
2026-09-23 from the original draft, Q4-Q12 answered 2026-09-23 after the security review that
raised them). The resolved records that follow are kept rather than deleted, so the reasoning
survives the next time someone asks why it was done this way.

### Resolved: how patterns are evaluated against the pinned `Scope(r)` (was Q13)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the pinned `Scope` type
grows an addressed-object field the handler supplies, and patterns narrow within one
identity-bound repository scope. The amendment is made in `format-handler-interface.md` ("The
pinned method set"), recorded there as an out-of-cycle amendment with its reason; the method set
stays at five, and only the type `Scope(r)` returns grows. Folded through Scope, Design
("Authorization is central, never per-handler", "Pattern scopes"), AC8, AC19, AC24 to AC26, the
Test Plan and Phases 1, 3 and 4.

Accepted cost: a second amendment to the pin outside its scheduled re-open, which erodes the
stability the experiment measures against; and every handler must report its addressed object
correctly or its pattern grants are silently wrong in one direction or the other. The compiler
holds none of that, so the catch is the per-format pattern-refusal cases (interface AC7, this
spec's AC8) and the per-route object tests (interface AC12). Folding it exposed two further
judgment calls, the grammar and what a patterned scope does on a request naming no object,
adopted below as Q18 and Q19.

Why the alternatives lost: B defers a decision the owner explicitly made and leaves AC19
unimplementable in a spec meant to reach `planned`, so CI credentials stay repository-wide
through Tier 1. C carves an exception to the identity-binding rule this spec treats as an
account-takeover defence, and still needs A for the tag half.

The question as raised: the 2026-09-23 scope decision layers path and tag patterns onto the
repository scope unit, but the pinned `Scope(r)` returned only a repository and an action, so
the shared layer never learned the path or tag a request addresses; the grammar and the range
(within a repository, or over repository names) were also undefined.

| Option | You get | It costs |
|---|---|---|
| **A. Amend the pinned `Scope` type now: repository, action, plus the addressed object (path/tag/package) where the route names one; patterns are within-repository** | AC19 implementable from the first format; identity binding untouched; one evaluator holds every grant decision | A second amendment to the pinned method set outside the scheduled re-open, and every handler must correctly surface the addressed object or its pattern grants are unenforced (the AC18/AC7 catch extends to cover this) |
| **B. Ship repository-granularity scopes first; patterns ride the post-OCI interface re-open** | The pin stays untouched until its scheduled evidence gate; the re-open designs the field from two real handlers | The owner's 2026-09-23 decision to bring patterns into scope is deferred, AC19 sits unimplementable in a `planned` spec, and CI credentials are repository-wide until Tier 1 |
| **C. Patterns also range over repository names, evaluated centrally against the name** | Fleet-style grants (`prod-*` repositories) with no interface change for the name half | A recorded exception to the identity-binding rule this spec calls "how stale grants silently reattach", and the tag half still needs A anyway |

### Resolved: the pattern grammar (was Q18, raised and adopted 2026-09-26)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a segment glob. `/`
separates segments, `*` matches one or more characters within one segment, `**` as a whole
segment matches zero or more segments, nothing else is special, and a pattern is validated at
creation. Folded through Design ("Pattern scopes", the grammar), AC19 and AC25.

The judgment call it settles: adopting pattern evaluation needed a grammar the scope decision
never stated, and the owner's own example, `prod/*`, reads two ways - "the direct children of
`prod`" or "everything under `prod`".

**Recommendation (adopted):** A, because it is the only option under which the scope
decision's own "no implicit wildcards" holds: reaching every depth takes the explicit `**`.

| Option | You get | It costs |
|---|---|---|
| **A. Segment glob: `*` within one segment, `**` across whole segments, nothing else special, validated at creation** | Deny-by-default holds: `prod/*` cannot reach `prod/x/y` unless written `prod/**`; the glob grammar CI authors already know from ignore files; small enough to fuzz | Two wildcards to explain; no alternation, so two disjoint prefixes need two scopes; the owner's `prod/*` example grants direct children only |
| **B. One `*` that crosses separators** | A single wildcard; `prod/*` means everything under `prod` | An implicit reach into every depth, the implicit wildcard the scope decision forbids: content added at any depth later is silently covered |
| **C. Regular expressions** | Anything expressible | Unanchored and catastrophic patterns are the classic over-grant and denial-of-service sources, and a grant becomes unreviewable at creation |

Accepted cost: an operator who meant "everything under `prod`" and wrote `prod/*` is refused
below the first level, which fails loudly rather than over-granting. B lost because it is the
implicit wildcard by another name; C lost because a grant nobody can read at creation is a
grant nobody reviewed.

**Why this is yours:** it interprets your own example, and it fixes the grammar every grant is
written in, which is a product surface.

### Resolved: what a patterned scope authorizes on a request naming no object (was Q19, raised and adopted 2026-09-26)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a patterned scope
authorizes content-addressed requests for `pull` and `push`, never for `delete`, and never
authorizes a request whose addressed object is none. Folded through Design ("Pattern scopes",
the evaluation rules and the object-kind table), AC24, and interface AC12.

The judgment call it settles: a pattern matches names, but a large share of real traffic names
none. OCI moves blobs, child manifests and upload sessions by digest, and every format has
listings that address the repository as a whole.

**Recommendation (adopted):** A, because it is the only option under which a tag-scoped OCI
token works at all while the destructive action and the name-revealing routes stay inside the
pattern.

| Option | You get | It costs |
|---|---|---|
| **A. Content-addressed allowed for `pull` and `push`, refused for `delete`; none refused** | Tag-scoped OCI tokens pull and push, including multi-architecture images; deletion by digest cannot escape the pattern; listings never reveal names outside it | A pattern narrows naming, not digest reachability: a tag-scoped token can fetch any content in the repository whose digest it knows, and can push an untagged manifest or a referrer by digest |
| **B. Refuse every non-named request under a patterned scope** | The strictest reading of deny-by-default | A tag-scoped OCI token cannot pull its own tag's blobs, so the feature is dead on the flagship format while appearing implemented |
| **C. Allow every non-named request under a patterned scope** | Nothing breaks | Listings enumerate names outside the pattern, and a tag-scoped `delete` token deletes any manifest by digest: an over-grant on the destructive action |

Accepted cost: the digest-reachability residual in A's row, named in Design so it is a property
rather than a surprise. B lost because a feature that cannot pass its own flagship format is not
a feature; C lost because it widens the one action whose mistakes are unrecoverable.

(Refined 2026-09-27 by the name-free-document decision below, was Q23: the none kind this record
refuses is now split, and a repository-wide document that names no object is a descriptor a
patterned `pull` may read. Every enumerating document, and every route this record's examples
name, stays none and stays refused; the reasoning above is unchanged.)

**Why this is yours:** it decides what a tag-scoped credential actually protects on a
content-addressed format, which operators will read as a promise.

### Resolved: a name-free repository-wide document under a patterned `pull` (was Q23, raised and adopted 2026-09-27)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a fourth addressed-object
kind, **descriptor**, for a repository-wide document whose body carries no name, version or
digest of any object the repository holds, which a patterned scope authorizes for `pull` only;
every enumerating document stays none. The kind is held by a mechanical enforcer, the sentinel
test, run inside each handler's per-route object table (`format-handler-interface.md` AC12).
Folded through Design ("Pattern scopes": the object-kind table, the evaluation rules, the
consumer declarations and the mechanical catch), AC32 and its Test Plan row, and Phase 4.

The judgment call it settles: the resolved requests-naming-no-object decision (was Q19) refuses
every none object to a patterned scope, and four format specs then found the same consequence
independently. Every cargo command opens with `config.json`, every Conan command with a
capability probe, every dnf and zypper refresh with `repomd.xml`, and every Helm read with
`index.yaml`; under three kinds each is none, so a credential holding only a patterned `pull`
fails at its first request and can run none of those clients. Each spec recorded the limitation
and the recipe (unpatterned `pull`, patterned `push` and `delete`) and asked this spec whether a
kind for "repository-wide but reveals no names" should exist, since the rule's purpose, that a
listing never reveals names outside the pattern, is untouched by a document that names nothing.

Verifying the ask against the four specs narrowed it: Cargo's `config.json`, Conan's probe and
user routes, RPM's `repomd.xml` and zypper's probes are name-free, but Helm's `index.yaml`
enumerates every version of every chart and RPM's `primary` enumerates every package in the
tree, so no honest kind can make helm, dnf or zypper runnable under a patterned-only `pull`.

**Recommendation (adopted):** A, because it makes the one client the rule was needlessly blocking
work without weakening what the rule protects, and because the kind can be defined as a test
rather than as a judgment.

| Option | You get | It costs |
|---|---|---|
| **A. A fourth kind, descriptor, `pull`-only for a patterned scope, defined by the sentinel test** | A patterned-only `pull` runs cargo end to end and passes Conan's probe; the deny-by-default reading survives because a descriptor names nothing by definition and the test enforces the definition; no per-handler exception | A fourth kind to misreport, caught only by the sentinel test; the gain is honest but small: cargo fully, Conan's probe only, RPM's failure point moves from `repomd.xml` to `primary`, Helm unchanged |
| **B. Keep three kinds; the documented recipe stands** | Nothing changes; three kinds are easier to reason about | A pattern-scoped read credential is impossible on every format whose client opens with a descriptor, for no protective reason on the name-free ones; four specs carry a limitation the rule never needed |
| **C. Render the enumerating documents filtered to the pattern** | A patterned `pull` runs every client, including helm, dnf and zypper | The handler must learn the pattern to filter, which is an auth check inside the handler, the boundary the constitution forbids; a filtered `repomd.xml` cannot carry the repository signature; and a per-pattern index is a second document per credential to generate and cache |
| **D. Exempt the specific routes per format** | The same reach as A with no new kind | A per-handler exception to the central rule, the class AC18 exists to catch; conan.md already rejected it as its option B |

Accepted cost: a fourth kind and a fourth way for a handler to be wrong, held by the sentinel
test rather than by review; and the limitation stays on Helm and RPM, stated exactly in Design so
nobody reads the kind as a fix it is not. B lost because it preserves a limitation with no
protective value on the name-free routes; C lost because it puts the pattern inside the handler
and breaks signed metadata; D lost because it is the per-format exception the central authorizer
exists to make unnecessary.

**Why this is yours:** it widens what a pattern-narrowed read credential can see, which
operators will read as a promise, and it settles the same question four format specs each
raised to this one.

### Resolved: route-scoped presentation forms and an off-route presentation (was Q24, raised and adopted 2026-09-27)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a route-scoped form is
declared by the handler beside its route-to-scope mapping (which routes accept it and where the
credential sits), the shared layer alone extracts, marks, verifies and redacts it, and a
recognised form presented on a route that does not accept it is an **authentication failure,
never anonymous**, its value redacted all the same. Folded through Scope, Design ("Presentation
forms", the three rules), AC7, AC27 and AC31 with their Test Plan rows, and Phase 1.

The judgment call it settles: consolidating the format-side folds gave this spec eight
presentation forms beyond the universal `Authorization` schemes, five of them accepted only on
some routes of one format (`X-NuGet-ApiKey`, `X-Jfrog-Art-Api`, `X-OpenVSX-Token`, the `token`
query parameter, the LuaRocks key segment, the Open VSX read segment). Two questions followed:
who says which routes accept a form, and what a form presented elsewhere means. `formats/openvsx.md`
had answered the second for its query parameter one way ("served as credential-less, so a token
pasted into a read URL grants nothing"), `formats/nuget.md` had left it open, and this spec's own
AC12 rule ("anonymous applies only when no credential is presented at all") points the other way.

**Recommendation (adopted):** A, because it is the only option that keeps AC12's rule
unconditional and keeps the credential out of the handler.

| Option | You get | It costs |
|---|---|---|
| **A. Handler declares the routes and the position; off-route presentation is an authentication failure, never anonymous; always redacted** | One rule for every form, the same one AC12 and AC31 already state for an unknown `Authorization` scheme; a handler never touches a credential; a token pasted where it does not belong fails loudly instead of silently reading as anonymous | Each route-scoped form costs a declaration, and the declaration mechanism is an interface re-open input rather than something the pinned method set carries today; `formats/openvsx.md`'s one sentence on read-route query tokens changes |
| **B. Off-route presentation ignored: the request is served credential-less** | Matches `formats/openvsx.md`'s wording; a stray token in a read URL is harmless to the request | A request that presented a credential is answered as the anonymous principal, the downgrade AC12 forbids, on an anonymously readable repository; a leaked-token probe learns nothing from the refusal but learns the anonymous view for free |
| **C. Every form accepted on every route** | No declarations, no off-route case | A credential field a client never sends on a route becomes an attack surface there for no client's benefit, and a query-string token on a read URL, which editors cache and log, would authenticate |

Accepted cost: the declaration, and one sentence in `formats/openvsx.md` (a sibling consequence).
No pinned client is affected: released ovsx sends `?token=` only on the publish routes, dotnet
sends `X-NuGet-ApiKey` only on `PackagePublish`, and the editors send no credential at all. B
lost because it is the anonymous downgrade under another name; C lost because it widens the
surface for nobody.

**Why this is yours:** it decides what a credential in the wrong place does, which is a security
posture, and it overrides a sibling spec's adopted wording.

### Resolved: who writes a response that carries the presented credential back (was Q25, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, on Opus, so it carries a Fable
recheck. Option A: a handler declares Conan's `users/authenticate` routes as exchange-echo
routes, and the shared layer answers them, verifying and authorizing as for any request and
writing the verified token back as a `text/plain` body with `Cache-Control: no-store`; the
handler never runs for the route. Folded through Design ("One route echoes a credential, and the
shared layer writes it"), the `conan` client row, AC35 and its Test Plan row, Phase 1 and AC10's
procedure list.

The judgment call it settles: the closing reconciliation sweep applied the `conan` client row
that `formats/conan.md` asked for (consequences Open item 22 and format batch 4), and verifying
it against that spec's resolved token-exchange decision (was Q6) found that the exchange answers
with the presented token itself. This spec's presentation-form rules say the shared layer
extracts, marks, verifies and redacts every credential "before the handler sees the request, so
a handler never reads a credential", and a handler that echoes the token must read it. Conan's
choice of what to return is settled there and not reopened here; only who writes it is.

**Recommendation (adopted):** A, because it keeps the rule that confines credential handling to
the reviewed shared layer unconditional, at the price of one declaration.

| Option | You get | It costs |
|---|---|---|
| **A. Declared exchange-echo route, answered by the shared layer** | The handler never touches a credential; the one response that carries a credential is written in one reviewed place, marked secret, uncacheable; a second format needing the shape adds a declaration, not code | A second kind of declaration beside the route-scoped forms, and a response body written by the shared layer on a format's route, both inside AC10's review; the declaration rides the same interface re-open input as the route-scoped forms |
| **B. The handler reads the Basic password and writes it back** | No new declaration | Breaks "a handler never reads a credential", the property AC10's review scope depends on; any handler could then echo, log or forward a credential, and the architecture boundary has an exception |
| **C. The shared layer mints a short-lived token for the body** | No long-lived value in the response | A third token-service product and a revocation window, the option `formats/conan.md` already rejected (its was-Q6 option B) because the client must hold the long-lived token regardless |

Accepted cost: one more declaration kind and one more item on the external review. B lost
because it makes the credential boundary conditional; C lost because it reopens a sibling's
settled decision for no reduction in exposure.

**Why this is yours:** it decides where the only response that returns a credential is written,
which is part of the credential boundary the external review certifies.

### Resolved: a token's authority relative to its owner (was Q20, raised and adopted 2026-09-26)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a token's effective
authority on each request is the intersection of its scopes and its owning principal's current
grants; minting a token wider than its owner is refused; tokens carry no administrative
authority. Folded through Scope, Design (the machine surface), AC30 and Phase 1.

The judgment call it settles: adopting human grants (Q16) gives principals authority, and tokens
are owned by principals, but nothing said whether a token is bounded by its owner at minting,
over time, or not at all.

**Recommendation (adopted):** A, because it closes the offboarding hole without a new concept.

| Option | You get | It costs |
|---|---|---|
| **A. Intersection with the owner's current grants, per request; minting beyond the owner refused** | Revoking a person's access revokes their tokens' matching authority on the next request; no escalation through tokens | Every token-authenticated request also resolves the owner's grants; a departing administrator's CI tokens stop working when they leave, so automation must be owned by a principal that outlives people |
| **B. Bounded at minting only** | Cheap; tokens behave like independent deploy keys | An offboarding hole: a removed person's tokens keep working until expiry or manual revocation |
| **C. No relation; ownership is metadata** | Maximum flexibility | Any principal allowed to mint tokens holds an escalation path |

Accepted cost: the extra lookup, and CI that breaks when its owner is removed. The
robot-account principal that answers the second cost arrived where this record said it would:
`credential-management.md`, "Robot accounts", whose AC9 asserts that a robot's tokens survive its
creator's removal (cited in Design since 2026-09-27; this spec defines no principal kind of its
own). B lost because the offboarding hole is the failure SSO exists to prevent; C lost because it
is an escalation primitive.

**Why this is yours:** it trades offboarding safety against CI stability, and it decides what
removing a person from the registry actually does.

### Resolved: where the token-management surface is specced (was Q21, raised and adopted 2026-09-26)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a dedicated sibling
spec, `foundation/credential-management.md`, owns token issuance, listing and revocation as a
product surface, the expiry-warning criterion, and any future robot-account principal. It was
owed when this was adopted and was authored 2026-09-27, carrying the criterion as its AC5 and the
robot as its "Robot accounts"; it must reach `planned` before OCI's Phase 1, which depends on it.
This spec keeps the mechanism and the rules that surface must obey (AC6, AC16, AC29, AC30), and
the new spec may not relax them. Folded through Scope (out of scope) and Design ("Token
expiry").

The judgment call it settles: the adopted expiry-warning placement (was Q15) sends the criterion
to "the credential-management surface spec the `docker login` credential decision creates",
while `formats/oci.md`, adopting that decision the same day, placed the surface's home on this
spec. Left as it stood, each spec pointed at the other and the criterion had no home.

**Recommendation (adopted):** A, because the surface is shared by every format's tokens and is
product-shaped, while this spec is the mechanism under an external-review gate.

| Option | You get | It costs |
|---|---|---|
| **A. A dedicated sibling spec, owed before OCI's Phase 1** | The surface specced as one (API, listing, expiry display, robot accounts later) and shared by every format; this spec's review scope (AC10) stays on mechanism | A spec that does not exist yet sits on the flagship format's critical path, and the loop must write and gate it |
| **B. This spec absorbs the surface now** | One document; the expiry-warning criterion lands immediately | The mechanism spec grows a product surface whose shape is not a security decision, and it reverses the expiry-warning placement adopted in the same pass |
| **C. `formats/oci.md` hosts it** | It sits with its first consumer | Every format's tokens would be managed from the OCI spec, a format owning a shared concern |

Accepted cost: an owed spec on the critical path, which the question-triage and the loop must
now schedule. B lost because it swaps a sequencing problem for a scope one and undoes a decision
adopted minutes earlier; C lost because tokens are not an OCI concept.

**Why this is yours:** it creates a spec and puts it on the flagship format's critical path.

### Resolved: a credential that spans two repositories (was Q22, raised and adopted 2026-09-26)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: multi-repository tokens
exist, but only by an explicit opt-in at creation, with each repository named by identity and
never by pattern; single-repository stays the default. This invokes the escape hatch the
multi-repository-token record (was Q17) left open, on a concrete protocol need rather than on
convenience. Folded through Scope, Design (the machine surface), AC29 and its Test Plan row.

The judgment call it settles: `formats/oci.md` adopted, the same day, that the pinned OCI suite
presents one credential against two repositories (the namespace, and the cross-mount namespace
it mounts into), and that a mount succeeds only when the credential can read the source. Its AC1,
the flagship gate, is therefore unsatisfiable unless this spec offers a credential kind holding
grants on two repositories, and the single-repository token adopted as Q17 alone does not.

**Recommendation (adopted):** B, because it meets the need inside the existing vocabulary and
with the posture the spec already uses for every risky state.

| Option | You get | It costs |
|---|---|---|
| **A. Keep tokens strictly single-repository** | The blast-radius property by construction, with no exception | `formats/oci.md` AC1 can never pass, and real cross-repository mounts always fall back to a full upload |
| **B. Multi-repository tokens by explicit opt-in, repositories enumerated by identity** | The OCI gate and real cross-repository mounts work; no new principal kind or vocabulary; the risky shape requires someone to choose it, like a non-expiring token | Blast radius one repository by default rather than by construction: an opted-in token's radius is its enumerated set |
| **C. A robot-account principal whose secret authorizes its grants** | A durable automation identity that also answers the token-authority record's departing-owner cost | A new principal kind, defined here before the credential-management spec that should own it, and still a single secret spanning repositories, so B's cost with more surface |
| **D. A conformance-only credential path** | No production change | An authentication path production never exercises, and a test-only bypass of the auth layer, on the very gate meant to prove it |

Accepted cost: the one-repository blast radius is now a default rather than a construction, and
the opt-in's existence will be used beyond conformance, which is intended: a CI job that mounts
across repositories needs it too. A lost because it blocks the flagship gate permanently; C lost
because it is B plus a principal kind this spec should not define ahead of its owning spec; D
lost because a test-only auth path is exactly what AC10's review would reject.

**Why this is yours:** it partly reverses a same-day adoption, and it decides how narrow the
default credential really is.

### Resolved: plaintext credential acceptance (was Q14)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a credential presented
over plaintext HTTP is refused unless an explicit flag (`--allow-plaintext-auth` or equivalent)
is set, the flag doubling as the behind-a-terminating-proxy declaration. Folded through Scope,
Design (the TLS paragraph, which also fixes that the refusal happens before lookup, is identical
for valid and invalid credentials, and never trusts a forwarding header), AC27 and Phase 1.

Accepted cost: every behind-a-proxy deployment, the common production shape, must set the flag,
and a wrong guess about what the proxy terminates surfaces as refused logins rather than as a
startup error. B lost because it left the one credential-leaking misconfiguration in the spec as
the only risky state no explicit choice guards, failing silently for as long as nobody looks.

The question as raised: every other risky state in this spec requires someone to choose it
(anonymous read, non-expiring tokens, the kept break-glass account), while plaintext credential
acceptance was guarded by a line in the deployment documentation and nothing else.

| Option | You get | It costs |
|---|---|---|
| **A. Secure by default: plaintext credential acceptance requires an explicit flag** | The dangerous state is unrepresentable by accident, consistent with the spec's own posture; a misconfigured deployment fails loudly at first login instead of leaking silently | Every behind-a-proxy deployment (the common production shape) must set the flag, and a wrong guess about what the proxy terminates produces a confusing startup-vs-runtime failure |
| **B. Documentation only, as currently written** | Zero deployment friction; the server stays agnostic about what sits in front of it | The one credential-leaking misconfiguration in the spec is also the only one nothing mechanical prevents, and it fails silently for exactly as long as nobody looks |

### Resolved: where the expiry-warning criterion lands (was Q15)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the warning criterion
lands in the credential-management surface spec that the non-interactive `docker login`
credential decision in `formats/oci.md` creates, and this spec records the outbound dependency.
Folded through Scope (out of scope, with the obligation named) and Design ("Token expiry", which
now states what that spec's criterion must assert: expiry visible and a near-expiry token
distinguishable on its surface before the token fails).

Accepted cost: the settled obligation stays unpoliced until that spec exists. The OCI
credential decision did not stall - `formats/oci.md` adopted it the same day - but it placed the
surface's home back on this spec, so the spec the criterion lands in is named by the
surface-placement record above (was Q21): `foundation/credential-management.md`, since authored, whose AC5 is the criterion. B lost because it would quietly spec the first
slice of the token-management surface before its owning decision is made, pre-empting it; an AC
here against a surface this spec does not define is the untestable-producer shape
`supply-chain-policy.md` already refused.

The question as raised: the resolved expiry decision obliges warnings "visible well before the
event, not delivered as a 401", and no criterion polices it, because this spec defines no
issue/list/revoke surface for the warning to live on.

| Option | You get | It costs |
|---|---|---|
| **A. Defer the AC to the credential-management surface spec; record the dependency here** | No invented surface colliding with the OCI credential decision; the AC arrives testable against a real surface | The settled obligation stays unpoliced until that spec exists, and if the OCI credential decision stalls, so does this |
| **B. Define a minimal observable now (expiry visible in a token listing; a near-expiry state distinguishable) and add the AC here** | The settled decision becomes enforceable immediately | This spec quietly specs the first slice of the token-management surface before the owner has decided its shape |

### Resolved: the human grant vocabulary (was Q16)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: human grants are
`(principal, repository, action)` in the same `pull`/`push`/`delete` vocabulary, each optionally
patterned exactly as a token scope, plus the single global admin role that already exists for
bootstrap. Folded through Scope (in scope, plus delegated grant administration named out of
scope), Design ("Human grants", and the bootstrap section's forward reference), AC14, AC19,
AC28 and Phase 2.

Accepted cost: granting a team of ten across ten repositories is a hundred grants with no
grouping, and "manage this repository's grants" is not expressible, so only the admin grants in
v1. B lost because named roles are a second authorization vocabulary beside the scope one, with
exactly the translation layer the scope-unit decision refused to build; C lost because global
read roles make repository-private-by-default hollow.

The question as raised: the machine side was fully specified, while the human side had two
states - nothing, and administer the registry - and an "explicit grant step" whose vocabulary was
never stated.

| Option | You get | It costs |
|---|---|---|
| **A. Per-repository grants in the machine vocabulary, plus the global admin role** | One evaluator and one vocabulary for humans and machines; AC14's "explicitly granted" becomes concrete with no new concepts | Granting a team of ten across ten repositories is a hundred rows with no grouping; "manage this repository's grants" needs `admin` to stretch or a fourth action later |
| **B. Named per-repository roles (reader/writer/maintainer) that bundle actions** | Matches what operators expect from Harbor/GitLab; delegation ("maintainer can grant") is expressible | A second authorization vocabulary beside the scope one, and the translation layer between them is exactly what the scope-unit decision refused to build |
| **C. Global roles only in v1** | Trivial to build and explain | Repository-private-by-default becomes hollow: anyone granted read reads everything, which contradicts the visibility model this spec just settled |

### Resolved: multi-repository tokens (was Q17)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a token's scopes all bind
to one repository; several actions on it are allowed, each optionally patterned. A token spanning
repositories remains the recorded escape hatch, adopted only if single-repository tokens prove
painful in practice. Folded through Scope, Design (the machine surface, and the OCI token
service's subset grant for multi-repository requests), AC26, AC29 and Phase 1, and the resolved
token-scope-unit record below, whose accepted-cost line read the other way and is corrected
there with a dated note, so the spec now carries one reading.

Accepted cost: a CI job spanning ten repositories manages ten tokens, and "painful in practice"
is a subjective trigger. Amended the same day by the two-repository credential record above (was
Q22): the escape hatch is opened as an explicit, enumerated opt-in because the OCI conformance
gate needs one credential on two repositories, so the single reading the spec now carries is
"one repository by default, several only by deliberate opt-in". B lost because it gives up the scope-unit resolution's central
rationale, a leaked token's blast radius of one repository, in exchange for convenience.

The question as raised: Design said verification resolves a token "to a principal plus its
scopes", and the scope-unit resolution kept "a leaked token's blast radius to one repository",
while the same resolution's accepted cost allowed "one deliberately broad token" and named a
multi-repository token as a future escape hatch.

| Option | You get | It costs |
|---|---|---|
| **A. Single repository per token; several actions allowed** | The blast-radius property holds by construction; token rows and revocation stay trivially per-repository | A CI job spanning ten repositories manages ten tokens, and the "painful in practice" trigger for revisiting is subjective |
| **B. Several repository scopes per token now** | One credential per CI job; the escape hatch never needs a migration | A leaked token's blast radius is whatever its author accumulated, and the scope-unit resolution's central rationale is quietly given up |

### Resolved: token hash function (was Q4)

**Settled 2026-09-23: SHA-256 with constant-time comparison, not bcrypt.** Bcrypt's cost is a
defence that low-entropy passwords need against offline cracking; a 256-bit random token has no
entropy problem, so the slowness buys nothing and is paid on every one of the hundreds of
requests in a single `npm install` or `docker pull`. This is what GitHub and most registries do
for API tokens.

Accepted cost: a deliberate divergence from the Stackweaver `apikey` port, which uses bcrypt
because it also authenticates lower-entropy material. The port is no longer a copy on this point.

### Resolved: revocation window for issued OCI tokens (was Q5)

**Settled 2026-09-23: an already-issued OCI token remains valid until expiry; AC5 now names
that window instead of promising it away.** Revocation is not checked per JWT use, because a
database lookup on every layer pull deletes the reason the self-contained token flow exists.

Accepted cost: a revoked credential keeps working for minutes on the OCI path. It is bounded by
the configured token lifetime and must be documented as a property rather than discovered as a
surprise. This corrects a criterion that the spec's own third auth path made false.

### Resolved: how central authorization learns its subject (was Q6)

**Settled 2026-09-23: each handler declares a route-to-scope mapping, and the shared layer
evaluates and enforces it.** Format knowledge stays in the format, so per-format URL grammar -
including OCI's slash-bearing repository names under `/v2/` - never reaches security-critical
shared code.

This adds `Scope(r)` to the pinned method set in `format-handler-interface.md`, needed from the
first format rather than at the scheduled re-open.

Accepted cost: a handler declaring its mapping wrongly under-protects itself, silently. AC18 and
AC7's per-format unauthenticated and unauthorized cases are the mechanical catch.

### Resolved: the first administrator (was Q7)

**Settled 2026-09-23: configuring OIDC requires naming at least one admin identity by
`(issuer, subject)` before the local admin is disabled.** This makes the locked-out state
unrepresentable: the only way in cannot be switched off without designating a replacement.

Rejected alternatives and why: first-login-wins is a race, and on a reachable registry that is a
real window for the wrong person to become the administrator; keeping the local account until
someone is promoted leaves a standing credential outside the identity provider for an
indeterminate period, which is how temporary states become permanent.

Accepted cost: one more required configuration field, and the operator must know their own
subject claim, which IdP consoles do not always surface clearly.

### Resolved: default authorization for a new identity (was Q8)

**Settled 2026-09-23: nothing.** Authentication succeeds and authorization is empty until
granted. Repositories are private by default, and nothing-by-default for principals is that same
posture applied to people.

Accepted cost: every new team member needs an explicit grant, so onboarding carries a manual
step. That is deliberate: the alternative defaults are the ones where a misconfiguration silently
gives everyone in the identity provider access to everything.

### Resolved: local admin credential lifecycle (was Q9)

**Settled 2026-09-23: generated from `crypto/rand` at first start, emitted to the server log
exactly once, stored only as a hash.** There is no default password to forget changing.

Accepted cost: one deliberate cleartext emission, which is why AC7's no-credentials-in-logs rule
now carries an explicit, narrow carve-out for it rather than being quietly violated. AC15 asserts
the emission happens exactly once and not on subsequent starts.

### Resolved: token expiry (was Q10)

**Settled 2026-09-23: tokens expire by default; a non-expiring token exists only by deliberate
opt-in.** The same shape as the anonymous-access resolution, where the risky state requires
someone to choose it.

Accepted cost: a CI token that expires silently breaks a pipeline at an inconvenient moment.
Expiry warnings must be visible well before the event rather than delivered as a 401.

### Resolved: the existence oracle (was Q11)

**Settled 2026-09-23: missing and forbidden are indistinguishable to a caller without read
access. Both return 404.** Private repository names are frequently guessable, and a distinct 403
confirms which guesses are correct, enumerating the private namespace.

Accepted cost: a legitimate user with a typo is told "not found" when the real problem is
permission, which is a genuinely confusing support case. AC17 requires the responses to be
indistinguishable in status, body and headers, so the diagnostic gap is real rather than
cosmetic.

### Resolved: scope action vocabulary (was Q12)

**Settled 2026-09-23: OCI's `pull`, `push` and `delete`, for every format.** The scope unit was
chosen because it needs no translation from OCI's grammar; a second vocabulary would reintroduce
exactly that translation layer at the token-service boundary.

Accepted cost: the words read as container-flavoured to a Maven or PyPI user, and `pull` is an
odd verb for a package download. That is a documentation problem, not a security one.

### Resolved: break-glass account (was Q1)

**Settled 2026-09-23: disabled once OIDC is configured, with an explicit opt-in flag to keep it.**
The common deployment then has exactly one identity source, and no forgotten local password sits
behind an SSO front door.

Accepted cost: an identity-provider outage locks everyone out unless the operator opted in
beforehand. The opt-in flag and its consequence must therefore be documented at the point of
configuring OIDC, not buried in a reference page.

### Resolved: token scope unit (was Q2)

**Settled 2026-09-23: repository plus action.** This matches OCI's own scope grammar, so the
OCI token flow needs no translation layer, and it keeps a leaked token's blast radius to one
repository.

Accepted cost: a CI job touching ten repositories carries ten tokens, one per repository. If
that becomes painful in practice it is an argument for a token that carries several repository
scopes, never for widening the scope unit itself. (Wording corrected 2026-09-26, when the
multi-repository-token question was adopted under the standing delegation: this line previously
read "ten scopes or one deliberately broad token", which suggested a token spanning repositories
exists today and contradicted the blast-radius rationale above. No such token exists.)

### Resolved: anonymous access (was Q3)

**Settled 2026-09-23: private by default, anonymous read enabled per repository by explicit
action.** A misconfiguration requires someone to actively make it, rather than being the default
state.

Accepted cost: publishing something genuinely public takes one deliberate extra step. That is the
right trade for a failure mode that is silent - nobody notices a private artifact was
world-readable until it matters.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-23 | 3e3ae0a | security + adversarial + constitution + go-spec-reviewer (claim verification vacuous pre-code: no `internal/auth` exists; the one checkable claim set, the Stackweaver `apikey` port, verified against that repo's `backend/internal/services/apikey/`) | First review. Applied the recorded-but-unapplied anonymous-access decision to Design and ACs (visibility section, AC11/AC12), fixed the session-management contradiction in "What is outsourced", and hardened directly: `(issuer, subject)` principal keying, OIDC flow-binding checks, token generation entropy, identity-bound scopes, Basic-form semantics, TLS requirement, and the OCI token service's fixed-algorithm and validation duties. Raised Q4-Q12 (verifier cost vs AC5, JWT revocation window, scope extraction mechanism, first-admin bootstrap, default role, local admin credential, token expiry, existence oracle, action vocabulary). Stays draft. |
| 2026-09-24 | 1701a48 | gate review (draft -> planned decision): folded-decision application over all 12 resolved records + adversarial + cross-spec (format-handler-interface's pinned `Scope(r)`, conformance-harness case validation, oci/generic client contracts, replication Q6, supply-chain-policy's precedent invocation) + constitution + go-spec-reviewer. Claim verification vacuous pre-code: no `internal/auth/**` exists, the tree holds only a stub `cmd/stackweaver-registry/main.go`; the one checkable claim set, the Stackweaver `apikey` port, was re-verified against that repo and one attribution corrected. Independent: this reviewer authored none of the spec's prior content | Gate not passed; stays `draft` on Q13-Q17. Eleven of twelve resolved decisions verified genuinely applied through Scope, Design, ACs and Test Plan; the twelfth, pattern scoping, is half-applied - present in Scope and AC19, absent from Design, and unimplementable against the pinned `Scope(r)` which returns only repository+action (Q13). Corrections applied: HMAC capability tokens re-attributed to `registry_artifact_token.go` (they are not in the apikey service); stale Open Questions intro (claimed Q4-Q12 awaited the owner; all were resolved); AC8 restored to "in both modes", matching interface AC7 and the harness's description of this very criterion; AC7 extended to scan a successful authentication's output, not only a failed one. Four Design-named security duties had no policing criterion and gained one each: AC20 (OIDC flow bindings and ID-token validation rejected per-tamper), AC21 ((issuer, subject) keying against email remap/collision), AC22 (session cookie flags, CSRF on state-changing UI routes, server-side logout), AC23 (token-service algorithm confusion and mid-flight key rotation). Raised Q13 (pattern evaluation vs the pinned Scope shape, grammar, and range), Q14 (plaintext credential acceptance: opt-in flag vs docs-only, the one risky state not behind an explicit choice), Q15 (where the promised expiry-warning criterion lands, given what was then oci.md Q3 owns the unspecced token-management surface), Q16 (human-side grant vocabulary between "nothing" and "administer"), Q17 (single- vs multi-repository token scopes, ambiguous between two of the spec's own passages). Replication's pending inbound amendment (instance-to-instance identity) recorded in Scope vocabulary so it arrives as a revision, not a surprise. AC10's external implementation review stands untouched; nothing in this pass satisfies it. |
| 2026-09-25 | 331ef25 | cross-spec sync from the ansible-collections first review. Not a review | The `ansible-galaxy` client-table row said "Bearer or Basic depending on the endpoint"; captured traffic (ansible-core 2.18.18rc1 against a logging server) shows `Authorization: Token <token>` on every request, with Bearer only under the Keycloak `auth_url` flow. Row split from `helm` and corrected with provenance; the least-certain caveat now names `helm` alone. |
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation. Not a gate review | Adopted Q13 A (pinned `Scope` gains an addressed object, patterns narrow within one identity-bound repository; the amendment itself made in the interface spec), Q14 A (plaintext credential refused before lookup unless the explicit flag is set, no forwarding-header trust), Q15 A (expiry-warning AC owed by the credential-management surface spec; outbound dependency recorded), Q16 A (human grants `(principal, repository, action)` with optional pattern, plus the global admin role, which alone administers), Q17 A (single-repository tokens; the resolved token-scope-unit record's contradictory "one deliberately broad token" wording corrected with a dated note so one reading remains). Folding exposed three judgment calls, raised and adopted as Q18 A (segment-glob grammar: `*` within a segment, `**` across whole segments, nothing else special, validated at creation), Q19 A (a patterned scope authorizes content-addressed requests for pull and push, never delete, and never a repository-wide or name-enumerating request) and Q20 A (token authority is the per-request intersection with its owner's current grants; tokens carry no administrative authority). Two more were forced by `formats/oci.md` adopting its own questions in parallel, and were raised and adopted here: Q21 A (the token-management surface, expiry-warning criterion and any robot-account principal belong to a new sibling spec, `foundation/credential-management.md`, owed before OCI's Phase 1, because the OCI spec placed the surface's home on this spec while Q15 had placed it there) and Q22 B (multi-repository tokens exist only by explicit opt-in with repositories enumerated by identity, because oci.md's flagship AC1 needs one suite credential on two repositories; Q17's record amended to the single reading "one repository by default, several only by deliberate opt-in"). Body: Scope (in and out of scope), Design (machine surface, TLS paragraph, OCI token service subset grants and pattern-carrying JWTs, bootstrap forward reference, Token expiry, central authorization's `Scope` shape, new Pattern scopes and Human grants sections), and replication's settled `pull` widening absorbed into a rewritten section, which also cleared a stale citation of replication's question as open. Criteria: AC8, AC14 and AC19 rewritten; AC24-AC30 added (AC29 carrying the Q22 opt-in), each with a Test Plan row; Phases 1-4 updated. AC10's external implementation review untouched and unsatisfied by this pass. Stays draft. |
| 2026-09-26 | fe54272 | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Items found already done: replication's settled `pull` widening (the section "What `pull` also authorizes: replication reads" already carries the adopted Q6 answer, the pattern-narrowed refusal, the replication package's own mapping under the central authorizer and the accepted widening, and cites it as resolved), and the OCI two-repository credential contradiction, already met by the resolved two-repository credential decision (was Q22) and AC29. Applied: the `docker`/`podman` row now states the token-endpoint credential (`formats/oci.md`'s resolved docker-login decision: registry token as the Basic password, username not an input, no refresh token, revocation inside AC5's window) and AC3 asserts it; a `cargo` row from `formats/cargo.md`'s captured traffic (bare token as the whole `Authorization` value on authenticated API requests; on index and download only after a 401 with `WWW-Authenticate: Cargo login_url="..."` and a retried `config.json` showing `auth-required`, 1.74 and later; search never authenticates), with the machine-surface paragraph, the TLS paragraph and AC27 extended to the scheme-less form and AC31 added for the four presentation forms; under Pattern scopes, Galaxy's addressed-object mapping (`{namespace}/{name}`, `{namespace}/{name}/{version}`, the publish object from the multipart file part's declared filename checked against `collection_info`, the poll reporting its task's object) and Cargo's; under Scope vocabulary, management operations mapped onto `delete` and `push` with no new action, and the Cargo `push` versus PyPI `delete` yank divergence recorded for `management-api.md` to reconcile. Phase 1 updated. AC10's external review untouched. |
| 2026-09-27 | a72f8ef | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every queued item targeting this file verified against the current text of its source spec before applying. Client table: rows for `dotnet` (X-NuGet-ApiKey on PackagePublish, Basic after a challenge, both headers on a challenged push), `gradle`/`sbt`/`lein` and the two-mode note on `mvn`, `composer` (preemptive Basic or Bearer keyed by origin with port), the conda family and `rattler-build` (four forms including the `/t/{token}/` path token), `R`/`renv`/`pak`, `terraform`/`tofu` (no credential on byte URLs), `dnf`/`dnf5`/`zypper`, `knife` and `berks`/`chef-cli` (RSA-signed writes; X-Jfrog-Art-Api reads), `puppet`/`r10k`, `luarocks`, `ovsx` and the editors, `cabal`/`stack`, each from its format spec's captured traffic. Theme 8 consolidated: a presentation-form table in Design (five `Authorization` schemes, three vendor headers, a query parameter, three path segments, the capability, the signed request) with three cross-cutting rules (declared position, two forms both verified, redaction and plaintext refusal per form); AC31 and AC27 rewritten to enumerate it, AC7 extended to spans, audit records and `telemetry.MarkSecret`. Q24 raised and adopted A: route-scoped forms declared by the handler, an off-route presentation an authentication failure, never anonymous (overrides one sentence in `formats/openvsx.md`, reported). The token service gains its second product, Terraform's download capability (Design, AC33); Chef's signed-request verifier specced under "Nothing is invented" (Design, AC34) with canonical-string construction added to AC10's scope. AC10's procedure now lists the review's full surface, including credential-management's OIDC exchange, signing-service's custody backends and key routes, and upstream-adapters' credential kinds and redactor; AC10 itself untouched. Web UI: `/ui/auth/*` routes, double-submit CSRF, `SameSite=Lax`, `GET /api/v1/session` (Design, AC22). New "Configuration" subsection tabling the `auth.*` keys `deployment.md` carries, plus `auth.token_service.lifetime`. Scope vocabulary cites `management-api.md`'s reconciliation (NuGet unlist and conda revoke under `delete`; Hex retire, conda patch and NuGet deprecate under `push`; grant administration and pointer actions). Credential-management now cited for the robot account (Q20's cost), the expiry criterion (its AC5), the `swr_` token shape and the presentation-form boundary (its was-Q6); the uniform challenge rule stated (AC17). Old-fold items (replication 1, data-model+oci 2, auth+FHI, format-management 7) found already applied. 34 criteria. Stays draft. |
| 2026-09-28 | 95346bd | cross-spec reconciliation sweep of the foundation wave. Not a review | Not a review. One item was raised against this spec after its own pass of 2026-09-27, by the observability, deployment and web-ui reconciliation, and it was verified against `management-api.md` AC28 and its endpoint table and against `web-ui.md`'s "Who am I" before applying: `GET /api/v1/session` answers a caller with no session `200` with `principal_kind: anonymous` and no grants, never `401`, so the UI's first paint needs no error branch. Design's session paragraph and AC22 rewritten; AC22 also states that an invalid or expired cookie on the route is refused `unauthenticated`, so the anonymous answer stays consistent with AC12's rule that anonymous applies only when no credential is presented at all; the Test Plan row shares the anonymous case with `management-api.md` AC28. Every other section of the consequences queue written after that pass was grepped for this file and carries no further item. AC10's external review untouched. Stays draft. |
| 2026-09-27 | 94f86f3 | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied the three auth items of the format-side reconciliation, each verified against the current `formats/cargo.md`, `formats/helm.md`, `formats/rpm.md`, `formats/conan.md` and `format-handler-interface.md`. The Cargo addressed-object bullet under Pattern scopes now follows cargo.md's table: the folded crate key (lowercase, `_` to `-`) rather than the registered spelling, `{crate}` on the index file and owners routes, `{crate}/{version}` on download, publish, yank and unyank. The Scope-vocabulary note recording a Cargo `push` versus PyPI `delete` yank divergence for `management-api.md` is replaced by the settled rule: one operation carries one authorization rule whatever wire it arrives over, and Cargo's yank and unyank are bindings onto the management API's yank operation needing `delete` (cargo.md's resolved yank-binding decision, was Q6). Raised and adopted Q23 A, the "repository-wide but reveals no names" judgment call four format specs sent here: a fourth addressed-object kind, descriptor, which a patterned scope authorizes for `pull` only, defined by a sentinel test run in each handler's AC12 object table; folded through the object-kind table, the evaluation rules, the consumer declarations, the mechanical catch, Phase 4, and the new AC32 with its Test Plan row. Verification narrowed the ask: helm's `index.yaml` and rpm's `primary` enumerate names and stay none, so the kind makes cargo runnable under a patterned-only `pull`, passes Conan's probe and moves rpm's failure to `primary`, and Design says so exactly. Q19's record carries a dated refinement note. AC10's external review untouched. Stays draft. |
| 2026-09-28 | 173da1b | cross-spec reconciliation of the Wave 1 folds, closing sweep of step 3, on Opus. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file from format batch 1 through format batch 8, plus the Open items whose auth half the progress log did not show applied (12, 16, 17, 20-23, 29, 30, 32), verified against the current text of its format spec before applying; each client row is written from that spec's own capture, never from the queue text. Client table: rows for `go` (format batch 2), `apt` and `dput` (batch 3, Open item 20), `conan`, `apk` and `pacman` (batch 4, Open items 22, 21, 32), `mix`/`rebar3` (batch 5, Open item 12), `cpanm`, `cpm`/`carton`, CPAN.pm, `cpan-upload` and julia Pkg (batch 6, Open item 16), `swift` and `dart pub` (batch 8, Open item 17), `vagrant`, `opam` and `brew` (batch 7, Open items 23, 29, 30); the `helm` row corrected from helm.md's captures (batch 3) and the least-certain caveat retired. Where queue and spec differed the spec won: the Pkg path is `{host}_{port}` as the capture shows, the `dart pub` row states it rests on client source rather than captured traffic, and Vagrant, which the queue did not name, is added beside Swift and pub as declaring a Bearer challenge because its spec declares one. Presentation forms: Bearer, Basic and scheme-less "Needed by" updated; no new form; Vagrant's `?access_token=` recorded as a non-form answered credential-less and redacted by observability's `RedactURL` (AC7 and its row extended). Uniform-challenge sentence names Swift, pub and Vagrant and lists the challenge-dependent clients the new rows add. Pattern scopes (batches 1, 2, 3, 5, 7): OCI's `{image}/{tag}` and the first-component repository (oci was-Q8), OCI's repository-less `GET /v2/` descriptor authorized by authentication alone with every other kind denied without a repository (AC32 extended, Test Plan row), Galaxy discovery a descriptor, the descriptor examples (Debian, Terraform, Hex, LuaRocks, Composer, NuGet, Swift) and enumerating none (Debian indexes, Chef universe, LuaRocks manifests). Raised and adopted Q25 A under the standing delegation: the `conan` row showed an exchange answering with the presented token, which the rule "a handler never reads a credential" forbids a handler to write, so the shared layer answers a declared exchange-echo route (Design, new AC35 with its Test Plan row, Phase 1). AC10 untouched; its procedure list extended with the repository-less rule, the exchange echo and the `access_token` redaction, no form outside it. `fable_recheck` added for Q25 and the repository-less rule. Stays draft. |
| 2026-09-28 | 1d6b1c8 | cross-spec reconciliation second pass on Opus, after the proxy-cache, storage-and-gc, supply-chain-policy and format-handler-interface closing sweeps. Not a review | Not a review. Applied the one item queued against this file after its closing sweep (proxy-cache closing sweep item 4, repeated as format-handler-interface closing sweep item 1), verified against the settled text of `proxy-cache.md` (resolved revalidation-replay decision, was Q18, AC26, "Revalidation outside the request") and `format-handler-interface.md` (resolved replay-entry decision, was Q11, AC18, "A second dispatch, below the authorizer"). Design, "Authorization is central, never per-handler", gains "The one entry that skips the authorizer": the replay entry named, its three enforcers in `internal/server` and `internal/proxy` adopted as this spec's, `internal/auth/arch_test.go` extended to assert no `internal/auth` package reads the replay marker, why it is safe (no principal or credential, response discarded, one constructor, recipient and call site on a fixed input) and six conditions that would make it unsafe. New AC36 with its Test Plan row; Scope and Phase 4 cite it. AC10's review list gains the replay entry as its fifth bullet, and the procedure's scope sentence now names every authorizer-bypassing entry and requires a listed surface landing after the first review to be reviewed before it reaches `main`: AC10's requirement is unchanged in force, only extended. The GET-only and remote-only refusal at the entry and the marker cases in `internal/server/replay_entry_test.go` are reported to `format-handler-interface.md`. No question raised or adopted; the fable_recheck marker is unchanged. |
| 2026-09-28 | 4278ce0 | leftovers pass of the closing sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied the items queued against this file after its second pass, each verified against the owning spec's settled text. Six-spec closing sweep item 2: the `upstream-adapters.md` bullet of AC10's review list names the Conan-shaped `basic-exchange` kind (a stored Basic pair traded for a `text/plain` token presented as Bearer), citing that spec's resolved Conan-exchange decision (was Q8) and its AC33; the list only grows, and AC10's requirement is unchanged in force. Async-operations closing sweep item 3 (optional, applied): "The one entry that skips the authorizer" cites `async-operations.md` AC30 for the queue giving the `proxy.revalidate` job no principal, and AC36's Test Plan row names that criterion's `internal/async/kinds_test.go` as the queue's half and shares the discarding-writer case with it. Found already done: every earlier item for this file. No question raised or adopted; roots untouched; the fable_recheck marker is unchanged. 36 criteria, each with a Test Plan row. Stays draft. |
