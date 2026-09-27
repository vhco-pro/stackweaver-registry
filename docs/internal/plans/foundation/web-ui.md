---
status: draft
status_description: "Authored 2026-09-27 at b98090c as a grounded first draft, not yet reviewed. Gathers the requirements project-charter.md (AC11, build step 9, the resolved web-UI-criterion decision), management-api.md (the UI is a client of /api/v1 and asserts nothing the API does not expose), credential-management.md (Phase 4, AC23), repository-lifecycle.md, artifact-verification.md, supply-chain-policy.md, signing-service.md, observability.md, async-operations.md, auth.md, proxy-cache.md, storage-and-gc.md, deployment.md, conformance-harness.md, format-handler-interface.md and fourteen format specs placed on the web UI; fixes the serving model (embedded in the binary under a reserved ui segment, strict CSP), the page inventory, the shared per-format surface declaration that feeds both the UI's client snippets and the conformance cases, the accessibility bar (WCAG 2.2 AA, axe-enforced) and the Playwright strategy. Nine questions adopted under the owner's standing delegation; zero open. Carries sibling consequences for management-api.md, auth.md, format-handler-interface.md, conformance-harness.md, supply-chain-policy.md, deployment.md, project-charter.md, data-model.md and repository-lifecycle.md, reported to the loop rather than applied here."
description: "Spec for the web UI: a TypeScript/React single-page application embedded in the server binary and served under a reserved ui segment, that signs a user in through OIDC or the local admin, browses and searches repositories, packages and versions of every implemented format through the management API alone, shows every user the client-configuration snippet for their tool generated from the same per-format declaration the conformance cases run, and gives an administrator repositories, upstreams, pointers, tokens, robots, grants, trust sets, verdicts, policy refusals, operations and pinned-storage visibility, at WCAG 2.2 AA, proven in a real browser by Playwright against a real server."
author: michielvha
goal: "Give the registry the human surface the positioning promises (multi-format plus proxy plus UI plus SSO, free) as a pure client of the management API, so that no capability exists only in the UI, every implemented format is browsable and configurable from the day its handler lands, and the UI is proven in a real browser with the same rigour the package clients get from the conformance harness."
priority: high
issue: 53
created: 2026-09-27
covers:
  - "web/**"
  - "internal/ui/**"
  - "internal/surface/**"
---

# Plan: Web UI

A TypeScript/React single-page application, built into the Go binary and served under the reserved
first path segment `ui`, that is a client of `management-api.md`'s `/api/v1` and nothing else:
sign-in through OIDC or the local admin, browsing and search across every implemented format,
per-format client setup snippets generated from the declaration the conformance cases also run,
and the administration of repositories, upstreams, pointers, tokens, robots, grants, trust,
policy refusals, operations and pinned storage, at WCAG 2.2 AA and proven by Playwright against a
real server ending in a real-client proxied install (`project-charter.md` AC11).

## Context

**Why a UI at all.** The positioning in `docs/internal/research/prior-art-artifact-repositories.md`
is that nobody ships **multi-format plus proxy/cache plus virtual aggregation plus a usable UI plus
SSO** for free: "Pulp has the plumbing and no UI", Gitea "cannot cache an upstream", Harbor "speaks
only OCI", and the commercial products fence SSO behind a licence. `project-charter.md` turned that
into a criterion under the owner's standing delegation (its resolved web-UI-criterion decision,
was Q6): AC11 requires that "the default build serves a web UI, behind no licence or feature flag,
in which a user signed in through OIDC browses the repositories, packages and versions of every
implemented format, and creates a remote repository with its upstream, which then serves a
proxied install to a real client", tested by "Playwright suite under `web/e2e/` against a running
server with an OIDC stand-in". The charter's Scope names "a future sibling web UI spec under
`docs/internal/plans/foundation/`" as the owner of "the page inventory, per-format rendering, the
design system". This is that spec. It satisfies AC11; it does not redefine it.

**Charter placement.** Build step 9: "the rest of the management surface, the web UI, OIDC SSO
and RBAC administration", placed after Tier 1 "for evidence: the UI renders the shared model's
entities for every implemented format, and drawing its per-format rendering contract from nine
real formats is better than guessing it from two. The management surface completes first because
the UI is its client." Its cost line is `shared:ui` in the charter's closed list.

**Who depends on this, and what each placed here.**

| Spec | What it requires of the UI |
|---|---|
| `project-charter.md` | AC11 (above); step 9; the UI renders the shared model's entities for every implemented format |
| `management-api.md` | The UI "is a client of this API and asserts nothing this spec does not already expose"; the API is API-first with the OpenAPI document as the contract; its Phase 4 (step 9) adds "registry-wide operation listing and filters, retirement and pointer reads the UI needs" and "nothing new in the write path" |
| `credential-management.md` | Its Phase 4 "The UI (charter step 9)" and AC23: token list with state and `expires_at`, `expiring` visually distinct from `active`, display-once secret "never again after navigation", revoke moves to `revoked`, the admin's robot page creates, disables and mints; Test Plan row `web/e2e/credentials.spec.ts` "lands with the UI at charter step 9" |
| `auth.md` | The human surface: OIDC Authorization Code with PKCE, local admin fallback (AC2), the session cookie with HttpOnly, Secure, SameSite and CSRF defense on state-changing UI routes (AC22), a brand-new identity holds no grants (AC14), the existence oracle (AC17: missing and forbidden indistinguishable), the human grant vocabulary and the single admin role |
| `repository-lifecycle.md` | Deletion confirmed by identity (`confirm: rep_...`, AC19), the `in-use` refusal naming each virtual member, `freeze` and `thaw`, rename with `Rename: unsupported` refused `capability-unsupported`, the deleted listing by identity; "a web UI or CLI for lifecycle operations" is out of its scope and "both are clients of the same API" |
| `artifact-verification.md` | "The web UI's rendering of verdicts: charter step 9; the verdict is exposed through the management API so the UI has something to render" (AC27, `GET /api/v1/repositories/{name}/verdicts/{digest}` and the trust routes) |
| `signing-service.md` | "The web UI's rendering of keys and fingerprints: charter step 9"; `formats/hex.md` wants the public key "shown in the management surface and UI together with its OpenSSH-style `SHA256:` fingerprint" |
| `supply-chain-policy.md` | AC5: every refusal recorded and "queryable afterwards", including after the blob is gone; AC14's operator alert; the condemnation record with its sources |
| `observability.md` | Dashboards excluded there ("a Grafana dashboard has no oracle beyond JSON validity"); `/readyz` with a body only on the telemetry listener because the main listener must not reveal deployment details; `X-Request-Id` on every response as the correlation field |
| `async-operations.md` | Operator controls "list, cancel, pause, resume" as `management-api.md` routes; the poll route `GET /api/v1/operations/{id}`; cancel refused `not-found` without the originating write's authorization |
| `proxy-cache.md` | Its resolved metadata-TTL decision: "an explicit refresh now action in both UI and API" |
| `storage-and-gc.md` | AC19: pointers whose target is outside the retention window are reported "so a forgotten environment pointer is discoverable from the API before it is discovered from storage growth"; the cost of the fifth mark root "was priced on the pin being visible and attributable" |
| `deployment.md` | "The web UI's packaging. It ships inside the binary at step 9 and needs nothing here beyond `server.public_url`"; the single-binary role table; `server.public_url` "used in every generated absolute URL" |
| `conformance-harness.md` | "Testing the web UI. That is Playwright's job, later"; `setup` provisions server-side state only and "everything client-side lives in the client container"; cases carry a `client` image and a `script` |
| `format-handler-interface.md` | Shared-layer routes mount under reserved first path segments the registration layer holds (AC11); non-root mounts are exactly `/{Name()}/`; the pinned method set is five and grows only by the owner |
| Format specs | `puppet.md`: "The registry's UI is where modules are browsed" and README rendering "is a presentation concern the UI owns"; `swift.md`: the signing entity extracted "so the UI and the corpus can show" it; `conda.md`: `channeldata.json` is served for "a UI"; `generic.md`: flat listing, "a UI derives one from the flat list"; `conan.md`: the UI reads the package name and version string; `terraform.md`: the richer module document "returns with the web UI"; `ansible-collections.md`: the bare collection list, if built for the UI, "is integration-tested, not conformance material"; `openvsx.md`: "this registry's web UI ... renders the shared model, not these documents"; `cargo.md`, `composer.md`, `chef.md`, `nuget.md`, `cran.md`, `maven.md`, `hex.md`, `npm.md`: their reference registries' browsing, download-count and login surfaces are "UI-era work" with no client oracle |

**The constitution's stack line.** `CLAUDE.md` fixes the stack as "Go 1.26. TypeScript/React
frontend (later; there is no `web/` yet)". The charter's "Language" section records the Go decision
only and says nothing about the frontend; the sibling consequence below asks it to name the
frontend language so the two do not read as a disagreement.

**State of the tree at b98090c.** No `web/` directory exists (`ls web` fails), `cmd/stackweaver-registry/main.go`
is a stub, and no `internal/` directory exists. `.github/workflows/ci.yml` already runs
`actions/setup-node@v6` with Node 22 for the docs job, so a Node toolchain in CI is not new. Chromium
is preinstalled in the agent environment at `/opt/pw-browsers` (`chromium-1194`,
`chromium_headless_shell-1194`), which is the layout `PLAYWRIGHT_BROWSERS_PATH` expects. A stray
2.4 MB executable `artifactory` sits at the repository root, committed in `9a8f86d`; it is unrelated
to this spec and is reported below for removal.

**Prior art consulted this run** (WebFetch, 2026-09-27), and what was taken and rejected:

- **Gitea** (`docs.gitea.com/usage/packages/npm`): each package type's page carries the client
  configuration as commands with placeholders, `npm config set {scope}:registry=https://gitea.example.com/api/packages/{owner}/npm/`
  and the matching `_authToken` line, with the owner in the URL path. **Taken:** a snippet per
  client tool with the instance URL, the repository and the credential as the three substitutions.
  **Rejected:** snippets as documentation prose the user edits by hand; here they are generated
  from a machine-readable declaration the conformance cases also execute, so a snippet that does
  not work fails a test before a user sees it.
- **Nexus Repository** (`help.sonatype.com/en/browsing-repositories.html`): "Select a repository to
  view a navigable tree containing the assets in the repository", "UI is limited to showing a max
  of 10,000 components per level for performance", an "HTML View" link that exposes the raw
  listing, and a `browse` privilege distinct from `read` ("Access via client tools without UI
  visibility"). **Taken:** the tree is derived client-side from a flat, paginated listing
  (`generic.md`'s adopted flat list says the same). **Rejected:** a separate browse privilege:
  `auth.md` has one vocabulary, `pull` reads, and a UI-only privilege would be a capability that
  exists only in the UI, the exact thing this spec forbids. Also rejected: a hard 10,000 cap
  instead of pagination.
- **pulp-ui** (`github.com/pulp/pulp-ui`): "a community driven single-page application that talks
  to a running pulpcore instance over its REST API", with cross-plugin search and task management,
  Node 22. **Taken:** the pure-API-client posture and cross-format search as a first-class page.
  **Rejected:** a separately deployed SPA needing CORS configuration against the API ("NOT to be
  used in production" for its proxy): `deployment.md` ships one binary, and same-origin serving
  removes CORS from the threat model entirely.
- **Harbor** (`goharbor.io/docs/2.12.0/working-with-projects/working-with-images/...`): the pages
  fetched describe labels ("The images can be filtered by labels") and role-gated actions; the
  robot-account behaviour this spec relies on ("the secret is shown once") is already recorded in
  `credential-management.md`'s prior-art table. **Taken:** filtering and role-gated action
  visibility. **Rejected:** Harbor's project as a grouping above repositories (`auth.md` fixed the
  repository as the unit of RBAC; `repository-lifecycle.md` names the grouping out of scope).
- **Artifactory**: JFrog's help portal returned no text to three fetches this run (client-rendered),
  so no claim about its "Set Me Up" behaviour is made here beyond the feature's name; the design
  below stands on Gitea's captured shape.
- **WCAG 2.2** (`w3.org/WAI/standards-guidelines/wcag/new-in-22/`): the criteria new at level AA
  are 2.4.11 Focus Not Obscured (Minimum), 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum)
  and 3.3.8 Accessible Authentication (Minimum); 3.2.6 Consistent Help and 3.3.7 Redundant Entry
  are new at level A. Each is named against a concrete design decision below rather than cited
  in bulk.

## Scope

**In scope**

- The serving model: the application embedded in the binary through `embed.FS`, mounted under
  the reserved first path segment `ui`, the exact root path redirecting to it, security headers
  and a strict Content Security Policy on UI responses only, and the build that produces the
  embedded assets.
- The API-client posture and its mechanical enforcement: every UI action is a `/api/v1` request,
  the browser sign-in routes are the only non-API routes, and nothing in the server exists for the
  UI alone.
- Sign-in and session: the OIDC redirect flow and the local admin form as `auth.md` defines them,
  the session cookie, CSRF on state-changing requests, sign-out, and what an anonymous visitor sees.
- The page inventory: repositories, packages, versions and files of every implemented format;
  cross-format search; the client setup page; repository administration (create, configure,
  freeze, thaw, rename, delete, virtual members, upstream binding); pointers and pinned storage;
  tokens and robots; grants; upstream credentials; trust sets, keys and verdicts; policy refusals;
  operations and jobs; the audit view.
- The **surface declaration**: one embedded per-format file, declared through an optional
  interface beside the handler, holding the client recipes the setup page renders and the display
  hints the package pages use, consumed by the UI through the API and by the conformance runner
  through the same renderer, so the snippet a user copies is the command a real client ran in CI.
- Accessibility at WCAG 2.2 AA, enforced by axe-core in every browser test and by named design
  rules for the criteria axe cannot see.
- The browser test strategy: Playwright under `web/e2e/` against a built binary with PostgreSQL,
  object storage, an OIDC stand-in, a fixture upstream and a real package client, including the
  charter's AC11 flow end to end.
- Performance budgets for the bundle and for list rendering as `make verify` and e2e gates.

**Out of scope**, each with a reason that is not effort:

- **Grafana dashboards and time-series views.** `observability.md` excluded dashboards because
  they have no oracle, and the UI has none for them either. The UI shows **records** the API
  serves (pointer pins, operations, refusals, retention state); rates, latencies and sweep
  durations stay in the operator's metrics stack. What an operator sees here versus in Grafana is
  therefore a clean line: state versus series.
- **Component health in the UI.** `observability.md` gives `/readyz` a body only on the telemetry
  listener because "the main listener must not reveal deployment details to anyone". The UI is
  served from the main listener, so a health page there would move that information onto it.
- **A public marketplace layer**: download counts, stars, ratings, curated lists. `composer.md`,
  `puppet.md`, `cargo.md` and `chef.md` each declined to store download statistics ("data nothing
  reads yet", "no oracle and no consumer"); a UI cannot render a number nobody records, and
  recording it is a data-model change those specs would raise.
- **Rendering per-format browse documents** (conda's `index.html`, Maven's directory listing, Hex's
  docs sites, Open VSX's web routes). Those are the handlers' served documents where an ecosystem
  defines them, or excluded by the format's spec; the UI renders the shared model
  (`openvsx.md`'s wording) and links to a handler document where the format serves one.
- **User and group management, password policy, MFA.** `auth.md` outsources identity to the
  provider; the UI shows the principal the provider returned and the grants it holds, and edits
  grants only. Groups are named out of scope by `auth.md`'s accepted cost ("a hundred grants with
  no grouping").
- **A UI-only permission** (Nexus's `browse`). One evaluator, one vocabulary (`auth.md`); anything
  the UI could show that the API would refuse is a leak, and anything it hides that the API allows
  is theatre.
- **Server-side rendering.** Every document the UI shows is behind the authorizer; a server render
  would put a second authorization path (template context) beside the API's, which is the
  duplicated-path trap the constitution names. The SPA has exactly one path to data.
- **Firefox and WebKit on every CI run.** The constitution's CI economy rule makes per-run minutes a
  budget; the resolved browser-matrix decision below runs Chromium on every run and all three
  engines on the main-gated job that already runs conformance.
- **Localised UI strings beyond English.** Strings live in a message catalogue and every date and
  number goes through `Intl`, so a locale is a catalogue file; no locale ships in v1 because no
  reviewer for one exists and an unreviewed translation is a defect that passes every test.

## Design

### Position: a client of `/api/v1`, and the two routes that are not

The UI holds no data and no rule. Every list it shows is an API listing, every action is an API
write, every refusal it renders is the API's `application/problem+json` body, and every
authorization decision it appears to make (a hidden button, a disabled form) is a rendering of a
grant the API returned and is re-decided by the API on the request. Three consequences follow, and
each is mechanically held:

1. **No private endpoint.** The server package `internal/ui` registers the static asset routes
   and nothing else. It imports `embed`, `net/http`, `io/fs` and the shared middleware, and never
   `internal/manage`, `internal/model`, `internal/storage` or any handler package. Data the UI
   needs and the API does not expose is a **sibling consequence on `management-api.md`**, never a
   route here. This pass found six such reads, listed under "Sibling consequences" below, and the
   UI is specified against them as if present.
2. **Two non-API routes exist**, both browser-only and both under the reserved `ui` segment:
   `/ui/auth/login` (starts the OIDC flow or shows the local admin form), `/ui/auth/callback` (the
   OIDC redirect target) and `/ui/auth/logout`. They are mounted by `internal/auth`, which owns the
   flow, under the segment this spec owns (the resolved browser-route decision below). Everything
   else the browser fetches is `/ui/*` static assets or `/api/v1/*`.
3. **The Playwright suite audits the network.** Every request the browser makes during the e2e
   suite is recorded; a request whose path is not `/ui/...` or `/api/v1/...` fails the run. The
   OIDC provider's own pages are the one allowed foreign origin, and only during the sign-in flow.

### Serving and mounting

- **Reserved segment.** `ui` joins `format-handler-interface.md`'s reserved list beside `api`,
  `healthz`, `readyz` and replication's segment, so no handler may be named `ui` or claim a
  root-anchored mount under it (its AC11 refuses both at registration). The exact root path `/` is
  served by `internal/ui` as a `302` to `/ui/`; the registration layer's mount rule already admits
  no handler mount at exactly `/` (non-root mounts are `/{Name()}/`, root-anchored claims are
  listed carve-outs and `/` is not one), and the sibling consequence asks the interface spec to
  record `/` as reserved so the next reader does not take the gap for an accident.
- **SPA routing.** Under `/ui/`, a request for an existing asset serves it; any other path serves
  `index.html` so the client router owns the URL. Content-hashed assets are served with
  `Cache-Control: public, max-age=31536000, immutable`; `index.html` with `Cache-Control: no-store`
  so a release is picked up on the next navigation.
- **Embedding.** `internal/ui/dist` is embedded with `//go:embed dist` and served through
  `http.FileServerFS` over `fs.Sub` (both stdlib since Go 1.22; the `go` skill's rule against
  third-party routers and helpers applies). The web build writes into that directory; a committed
  placeholder `index.html` keeps `go build` and `go test ./...` working on a checkout without a
  Node toolchain, and says in plain text that the UI was not built. The placeholder cannot pass
  any browser test, and `make build`, the Dockerfile and the GoReleaser hook always build the
  frontend first, so the artefacts the charter's "default build" names never carry it (the resolved
  placeholder decision below).
- **Build.** `web/` is an npm workspace with a committed lockfile: TypeScript, React, Vite, Node
  22 (the version CI already installs). `make web` runs `npm ci` and `vite build` into
  `internal/ui/dist`; `make build` depends on it; `deploy/goreleaser.yaml` gains a `before` hook
  running it; the Dockerfile gains a Node build stage whose output is copied into the Go build
  stage. `make verify` runs the web unit tests, the type check, the lint and the bundle checks
  below, scoped to staged files exactly as it is for Go.

### Security headers and the Content Security Policy

Responses under `/ui/` carry, and responses on every other route do not carry:

```
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self';
  img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';
  base-uri 'none'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: same-origin
Cross-Origin-Opener-Policy: same-origin
```

- **No inline script or style, no `unsafe-inline`, no nonces.** The Vite build is configured to
  emit no inline script (no module preload polyfill inline, no inlined small assets as script),
  and `make verify` greps the built `index.html` and every emitted chunk for `<script>` bodies,
  `on*=` attributes and `style=` attributes and fails on any. A nonce scheme would need
  server-side templating of `index.html`, which is the server-rendering path Scope rejects.
- **No remote images.** Package metadata carries logos, badges and README images from arbitrary
  hosts. Loading them would make every page view a request to a host the package author chose,
  which is an IP-disclosure and tracking vector for every user of a private registry. Remote image
  URLs render as links.
- **Markdown** (npm and Puppet READMEs, Helm chart descriptions, and any format whose version
  document carries a long description) is rendered client-side through a sanitiser with an
  element and attribute allowlist, raw HTML dropped, `javascript:` and `data:` link schemes
  refused, and every link given `rel="noopener noreferrer"` (the resolved README-rendering
  decision below). The CSP is the second wall, never the first.
- **Format routes are untouched.** Package clients neither need nor expect these headers, and a
  `frame-ancestors` or `form-action` directive on a handler route is a compatibility risk with no
  benefit. `internal/ui/headers_test.go` asserts presence on `/ui/` and absence on a fixture
  handler route and on `/api/v1/`.

### Authentication in the browser

- **Sign-in** follows `auth.md`'s human surface. `/ui/auth/login` redirects to the configured
  provider with `state`, `nonce` and a PKCE verifier bound to the flow; `/ui/auth/callback`
  completes it, maps `(issuer, subject)` to the principal and issues the session cookie (HttpOnly,
  Secure, `SameSite=Lax`, `Path=/`). With no provider configured the same route renders the local
  admin form (auth AC2). The UI never sees an ID token, an access token or a password after the
  form submits; it sees a cookie it cannot read.
- **The API accepts the session.** A `/api/v1` request may authenticate with a bearer token or with
  the session cookie; the same authorizer decides, and the principal is the same shape (the
  sibling consequence to `auth.md` and `management-api.md` records that acceptance). Because a
  cookie is an ambient credential and a bearer token is not, **a cookie-authenticated request with
  an unsafe method must carry a CSRF token** and a bearer-authenticated one never does.
- **CSRF** is the double-submit pattern: at session issue the server also sets a non-HttpOnly
  cookie `stackweaver_csrf` holding a random value bound to the session; the client reads it and
  sends it as `X-CSRF-Token` on every `POST`, `PUT`, `PATCH` and `DELETE`; the server refuses a
  cookie-authenticated unsafe request whose header is absent or does not match with
  `unauthenticated` (auth AC22 asserts the refusal; this spec's AC13 asserts the browser side).
  `SameSite=Lax` is defense in depth, not the defense: it does not cover top-level `GET`-initiated
  navigations that some flows turn into state changes, so no state changes on `GET` anywhere.
- **Who am I.** On load the client calls `GET /api/v1/session` (a sibling consequence) and receives
  the principal (display name, `(issuer, subject)` never shown as an identifier to other users,
  admin flag) and the grants it holds, from which the client decides what to render. An anonymous
  visitor receives an anonymous principal with no grants and sees what visibility allows (the
  resolved anonymous-access decision below).
- **Sign-out** calls `/ui/auth/logout` with the CSRF token, which invalidates the session
  server-side (auth AC22) and clears both cookies; the client then drops its state and returns to
  the repositories page as anonymous.
- **Accessible authentication (WCAG 3.3.8, AA).** No cognitive test anywhere in sign-in: the OIDC
  button is one activation, and the local admin form allows paste and password managers (no
  `autocomplete="off"`, no paste blocking), which is what the criterion's "mechanism to assist"
  clause requires.

### The existence oracle in a browser

`auth.md`'s resolved existence-oracle decision (was Q11) and AC17 make a private repository the
caller cannot read indistinguishable from one that does not exist. A UI can break that without a
single bad API call, so the rules are explicit:

- A route for a repository the API answers `not-found` renders **one** not-found page, the same
  component with the same text, whether the name exists or not; the page never says "you may lack
  permission", because that sentence is true in exactly one of the two cases.
- The client never fetches a repository it did not receive in a listing except when the user
  navigated to its URL, and it never pre-fetches, autocompletes or "did you mean" across names the
  listing did not return. Search is server-side and returns only what the caller may read.
- Timing: the client renders not-found on the response, with no additional request in one branch,
  so the two cases take the same round trips. AC15 compares the two rendered documents and the two
  request sequences.

### The surface declaration: one source for snippets and conformance

**The problem.** Thirty-three ecosystems, fifty-plus client tools. A hand-written "how to configure
your client" page per format is thirty-three pages nobody tests, drifting from the day each is
written; the constitution's rule that the client, not the documentation, is the specification
applies to our own documentation too. The setup page must therefore be **generated from a
declaration a real client executes in CI**.

**The declaration.** Each handler package holds one embedded file, `internal/format/<name>/surface.yaml`,
parsed once at registration into a `surface.Declaration`:

```yaml
recipes:
  - id: npm-config            # stable id, referenced by conformance cases
    client: npm               # a client the catalogue's reach column names
    family: npm               # groups Yarn, pnpm and Bun under one card
    title: "npm, Yarn, pnpm"
    steps:
      - kind: shell
        template: |
          npm config set registry {{ .RepositoryURL }}
          npm config set //{{ .Host }}/{{ .RepositoryPath }}:_authToken {{ .Token }}
    variables: [RepositoryURL, Host, RepositoryPath, Token]
display:
  description: [description]              # keys in the version document, in preference order
  homepage: [homepage]
  licence: [license]
  readme: {key: readme, format: markdown}
  coordinate: "{{ .Package }}@{{ .Version }}"   # how the ecosystem writes the coordinate
```

- **Recipes** are `text/template` bodies over a closed variable set the renderer supplies:
  `RegistryURL` (from `server.public_url`), `Host`, `RepositoryName`, `RepositoryURL`,
  `RepositoryPath`, `Package`, `Version` (when rendering for a version page) and `Token`, which is
  a placeholder the setup page shows with a link to create a token and which the conformance runner
  fills from the case's `setup`-issued credential. A template referencing a variable outside the
  set fails at registration.
- **Display hints** name which keys of the format's opaque metadata document mean description,
  homepage, licence and README, and how the ecosystem writes a coordinate (`hello@acme/stable` for
  Conan, `group:artifact:version` for Maven). Absent hints degrade to the generic rendering: the
  document as a collapsible key-value tree. The hints are where the charter's "per-format
  rendering contract" lives, and drawing them from nine real formats at step 9 is exactly the
  evidence order the charter wanted.
- **How the shared layer reaches it** without a sixth pinned method: the optional interface
  `surface.Declarer` with one method, `Surface() surface.Declaration`, type-asserted at
  registration, the same shape `management-api.md` adopted for its optional operation interface
  (the resolved declaration-home decision below). A handler without it renders generically and
  offers no recipe, which AC17 turns into a failure: every registered format must declare at least
  one recipe, because a format with no way to configure its client from the UI is Gitea's feature
  set, not ours.
- **Cost attribution** follows the charter's path rule mechanically: `surface.yaml` under
  `internal/format/<name>/` is `format:<name>`; the renderer and the declaration types under
  `internal/surface/` are `shared:ui`.

**The two consumers.**

1. **The API** serves `GET /api/v1/repositories/{name}/recipes` (a sibling consequence): every
   recipe of the repository's format rendered for that repository with `Token` left as the
   placeholder, plus the raw templates. Automation gets the same snippet a human does; the UI's
   setup page is a rendering of this response and holds no template of its own.
2. **The conformance runner.** A case's `client` block gains a `recipe:` field naming a recipe id;
   the runner renders it through `internal/surface` with the case's registry URL and credential and
   runs the rendered steps inside the client container before `script` (a sibling consequence to
   `conformance-harness.md`; `setup` stays server-side and closed). Two validator rules complete
   the loop: a case naming an undeclared recipe id is rejected before any container starts, and
   every declared recipe is named by at least one passing case in the format's suite, so no
   snippet reaches the setup page without a real client having run it.

The AC11 flow closes the loop from the other side: the e2e suite copies the snippet the setup page
shows for the remote repository it just created, runs it verbatim in the harness's client
container, and installs through the proxy.

### The stack

- **TypeScript and React** (the constitution's stack line), Vite for the build, React Router for
  client routing under `/ui/`, TanStack Query for server state (request deduplication, cache
  invalidation on writes, retry policy set to none on `4xx`), and **React Aria Components** for
  the interactive primitives (dialog, menu, combobox, listbox, tabs, table) because the
  accessibility criteria below are met or missed inside those widgets and hand-rolled ones miss
  them (the resolved component-library decision below). Styling is plain CSS with custom
  properties for the design tokens, no runtime CSS-in-JS: the CSP forbids inline styles and a
  runtime injector needs them.
- **The API client is generated** from `internal/manage/openapi/v1.yaml` with `openapi-typescript`
  into `web/src/api/schema.d.ts`, committed, and a `make verify` step regenerates and diffs it, the
  same discipline `management-api.md` AC25 applies to the document itself. A UI call to a route
  absent from the document does not type-check, which is the compile-time half of "no private
  endpoint".
- **Errors** are `application/problem+json` rendered by one component: `title`, `detail`, the
  extension members the type defines (the refused coordinates, the `in-use` members, the reach of
  a repoint) and the response's `X-Request-Id`, shown with a copy button so a user can hand an
  operator the correlation id `observability.md` logs against. No error string is invented
  client-side for a server refusal.
- **Design tokens** cover colour (with a dark scheme through `prefers-color-scheme`), type scale,
  spacing, radius and focus ring; every state colour pairs with a text label or icon, so no
  information is colour-only (WCAG 1.4.1). Contrast is 4.5:1 for text and 3:1 for UI components in
  both schemes, checked by axe.
- **Configuration**, following the `cobra-viper` skill through `deployment.md`'s schema, typed into
  `ui.Config`: `ui.instance_name` (default `Stackweaver Registry`; the header and document title)
  and `ui.help_url` (default the project's documentation site; the help link WCAG 3.2.6 needs in a
  consistent place). No key disables the UI (charter AC11: "behind no licence or feature flag").

### Page inventory

Every page below is a rendering of API resources named in `management-api.md` or in the sibling
consequences; the "API" column is the contract the page is written against. "Anyone" means the
anonymous principal, subject to visibility.

| Page | Who | What it shows and does | API |
|---|---|---|---|
| **Repositories** (`/ui/`) | anyone | Every repository the caller may read: name, format, type (`local`, `remote`, `virtual`), visibility, read-only flag; filters by format and type; the admin additionally sees the deleted listing by identity, awaiting reclamation | repository listing; formats listing |
| **Search** (`/ui/search`) | anyone | Package name search across every readable repository, results grouped by format with the coordinate rendered by the format's display hint | `GET /api/v1/search` |
| **Repository** (`/ui/r/{name}`) | `pull` | Tabs: Packages, Set up client, Pointers, Operations, Trust, Refusals, and for the admin Settings, Grants, Audit; a `remote` shows its upstream and a "refresh now" action; a `virtual` its ordered members | repository read; package listing; recipes; pointers; operations; trust; refusals |
| **Package** (`/ui/r/{name}/p/{package}`) | `pull` | Versions newest first with withdrawn and retired state, the package-level document (npm dist-tags, Maven `latest`) through the display hints, the client snippet for this package | package and version listings; recipes with `Package` |
| **Version** (`/ui/r/{name}/p/{package}/v/{version}`) | `pull` | Files with digest and size, the version document (description, licence, homepage, README via hints, else the tree), verdicts per file (verified, failed, absent, with scheme, identity and reason), refusals, references, provenance and upstream origin of cached files, Swift's signing entity, Hex's key fingerprint; actions by grant: withdraw, restore, annotate, delete version, retire | version and file reads; verdicts; refusals; `POST .../operations` |
| **Set up client** (`/ui/r/{name}/setup`) | `pull` | One card per recipe family; the client picker within a family (Maven, Gradle, SBT, Ivy, Leiningen); each step rendered with copy buttons; the `Token` placeholder links to token creation | recipes |
| **Pointers** | `pull`; writes `push`/`delete` | Each pointer with target snapshot, write time and how far rollback reaches; a pointer outside the retention window flagged with how far it has aged (storage AC19, the pinned-storage view); create, repoint, roll back (target another pointer or an in-reach snapshot), delete a named pointer | pointer listing and writes |
| **Operations** | `pull`; admin registry-wide | Per repository, and registry-wide for the admin (`/ui/operations`): kind, target, state, principal, request id, filters; detail with the result document or the problem; cancel, pause, resume where `async-operations.md` allows, refused as `not-found` when the caller lacks the originating authorization | operation listing and controls |
| **Trust** | `pull`; admin writes | The repository's trust set and revision, keys with fingerprints in the form the ecosystem's client prints (`SHA256:` for Hex), import from keyserver or upstream | trust routes |
| **Refusals** | `pull` | Every policy refusal for the repository: coordinate, digests, rule, advisory or signal, sources of a condemnation, whether the bytes are still held | `GET .../refusals` |
| **Settings** (admin) | admin | Type-specific forms: visibility, retention rules, the format's `settings` document validated by the handler, upstream URL, adapter, download policy and credential reference for a `remote`, ordered members for a `virtual` with move-up and move-down buttons and a text position field (WCAG 2.5.7: no drag-only ordering); freeze and thaw; rename, refused with the format's reason when its capability is `unsupported`; delete | repository `PATCH`; lifecycle operations |
| **Delete repository** (admin) | admin | A dialog naming the repository, its type, its member-of relationships and the reclamation behaviour; the admin types the repository **name** to confirm and the client sends the **identity** the page loaded as `confirm`, so a delete-and-recreate race between page load and submit is refused by the API (lifecycle AC19); an `in-use` refusal lists each virtual member and offers `detach` behind a second confirmation | repository delete |
| **Create repository** (`/ui/new`, admin) | admin | Format picker from the formats listing (only registered formats, with proxy and virtual capability shown), type, name, visibility, then the type's fields; success lands on the new repository's setup tab, which is where the AC11 flow copies its snippet | repository create; formats listing |
| **Tokens** (`/ui/tokens`) | signed in | `credential-management.md` AC23: the caller's tokens with state badge and `expires_at`, `expiring` distinct from `active` by icon, label and colour; create with scope picker, the secret shown once in a dismissable panel that no navigation, refresh or history step brings back; revoke moves the row to `revoked` and keeps it listed | `/api/v1/tokens` |
| **Robots** (`/ui/robots`, admin) | admin | Robots with description and state; create, disable, mint a token, the trust policy for OIDC exchange | `/api/v1/robots` |
| **Grants** (admin) | admin | Per repository and per principal: `(principal, repository, action, pattern)`; create and revoke; the principal picker lists principals the API returns | grants routes |
| **Upstream credentials** (`/ui/upstream-credentials`, admin) | admin | Name, kind, last rotation; create, rotate, delete; the value is write-only and the UI has no field that could display it | upstream credential routes |
| **Audit** (admin) | admin | The operations listing filtered as the audit view: who did what to which coordinate, when, under which request id, including refusals where the API records them | operation listing with filters |
| **Sign in** (`/ui/auth/login`) | anyone | The provider button, or the local admin form when no provider is configured | `internal/auth` |
| **Not found** | anyone | One page for missing and forbidden alike | any `not-found` |

Two rules cut across every page:

- **Pagination everywhere the API paginates**: the client follows `Link: rel="next"` with the opaque
  cursor and never asks for an unbounded list. Trees (generic's paths, Debian's pools) are derived
  client-side from the flat listing one page at a time, Nexus's lesson without Nexus's cap.
- **Actions are rendered from grants and re-decided by the API.** A user without `delete` does not
  see the delete action; a user who forges the request gets the API's `unauthorized`, which the
  UI renders as it renders any problem. Hiding is a courtesy, never the control.

### Accessibility: WCAG 2.2 AA, by named decision

axe-core runs in every Playwright page test with the rule tags `wcag2a`, `wcag2aa`, `wcag21a`,
`wcag21aa` and `wcag22aa`, and any violation fails the test (AC20). axe cannot see everything, so the
criteria it cannot check are each held by a design rule and a targeted test:

| Criterion | Design rule | Held by |
|---|---|---|
| 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.7 Focus Visible | Every action reachable by Tab and activated by Enter or Space; a visible focus ring from the tokens on every focusable element; dialogs trap and return focus | `web/e2e/keyboard.spec.ts` drives the AC11 flow with the keyboard alone |
| 2.4.11 Focus Not Obscured (Minimum) | Sticky headers and toasts never cover the focused element; `scroll-padding` set to the header height | keyboard spec asserts the focused element's bounding box intersects the viewport minus sticky regions |
| 2.5.7 Dragging Movements | Virtual member ordering and every reorder has move-up, move-down and a numeric position field | settings spec reorders without pointer drag |
| 2.5.8 Target Size (Minimum) | Every interactive target at least 24 by 24 CSS pixels or spaced so; inline text links exempt as the criterion allows | axe `target-size` rule plus a spec measuring icon buttons |
| 3.2.6 Consistent Help | The help link (`ui.help_url`) sits in the same header position on every page | header component test |
| 3.3.7 Redundant Entry | Multi-step forms (create repository) keep entered values across steps and on a refused submit | create spec asserts values survive a `validation` refusal |
| 3.3.8 Accessible Authentication | No CAPTCHA, no puzzle; paste and autofill permitted on the local admin form | sign-in spec pastes the credential |
| 1.4.1 Use of Colour, 1.4.3 Contrast | State badges carry text and icon; tokens verified at 4.5:1 and 3:1 in both schemes | axe `color-contrast` in light and dark |
| 1.4.13, 2.3.3 | Tooltips dismissable by Escape; `prefers-reduced-motion` disables transitions | component tests |
| 4.1.2 Name, Role, Value | Widgets from React Aria Components; custom components carry explicit roles and labels; every table has a caption and column headers | axe |

Live regions announce list refreshes and operation state changes (`aria-live="polite"`), and the
document `lang` is set from the catalogue's locale.

### Performance budgets

"Fast" is not an exit code, so it is a gate:

- **Bundle**: the initial route's JavaScript at most 250 KB compressed, the whole application at
  most 800 KB compressed, measured after the build by a check in `make verify` that fails on
  regression (AC21). Routes load their chunks lazily.
- **Lists**: the repositories page with 10,000 seeded repositories and a package page with 10,000
  versions each render their first page and become interactive within 2 s of navigation on the CI
  runner, measured in the e2e suite (AC22); tables virtualise rows beyond the first page.

### Testing strategy

- **Unit** (Vitest, React Testing Library): components, the problem renderer, the recipe card,
  the sanitiser allowlist, the CSRF header injection in the API client.
- **Server** (`go test ./internal/ui/... ./internal/surface/...`): SPA fallback, redirect from `/`,
  cache headers, security headers present and absent, embedded placeholder detection, recipe
  rendering and variable-set validation, the architecture tests.
- **End to end** (Playwright, `web/e2e/`, `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` locally):
  against the `make build` binary with PostgreSQL, an S3-compatible store, an OIDC stand-in
  container (the provider `auth.md` AC1's first container is), a fixture upstream from the
  conformance harness and the harness's real client image for the proxied install. Each spec
  seeds state through the API or the `seed` subcommand (`conformance-harness.md`'s seed path),
  never through SQL. Chromium on every run; Chromium, Firefox and WebKit on the main-gated job that
  runs conformance (the resolved browser-matrix decision below). The suite also runs the network
  audit, the axe checks and the existence-oracle comparison.
- **Contract**: the generated API types regenerate identically from the checked-in OpenAPI
  document; the surface declarations validate; every recipe is exercised by a conformance case.

### Mechanical enforcers

Each boundary this spec introduces and the test that holds it, per the constitution's rule that a
boundary enforced only by review is not enforced:

| Boundary | Enforcer |
|---|---|
| `internal/ui` registers only the static routes and the root redirect, and imports no model, storage, management or handler package | `internal/ui/arch_test.go` (route table and import graph) |
| No UI-only capability: every browser request during the e2e suite is `/ui/*` or `/api/v1/*` | `web/e2e/network-audit.ts`, a fixture every spec installs |
| No API call outside the OpenAPI document | generated `schema.d.ts` type check; `make verify` regeneration diff |
| Security headers on `/ui/*` only; no inline script or style in the bundle | `internal/ui/headers_test.go`; `web/scripts/check-bundle.mjs` in `make verify` |
| `ui` is a reserved segment and `/` is not claimable | `format-handler-interface.md` AC11's `internal/format/register_test.go`, with a fixture handler named `ui` |
| Every registered format declares at least one recipe; every recipe renders with the closed variable set; every recipe is named by a passing conformance case | `internal/surface/declaration_test.go` over the handler registry; `conformance/core/case_validate_test.go` (the two validator rules the harness gains) |
| Missing and forbidden render identically | `web/e2e/existence-oracle.spec.ts` (DOM and request-sequence equality) |
| Cookie-authenticated unsafe requests carry CSRF; bearer ones need not | `internal/auth/session_test.go` (auth AC22); `web/e2e/csrf.spec.ts` (a cross-site form post is refused) |
| WCAG 2.2 AA | `@axe-core/playwright` in every page spec; the targeted specs in the table above |
| Budgets | `web/scripts/check-bundle.mjs` size check; `web/e2e/perf.spec.ts` |

## Acceptance Criteria

Each criterion is independently testable and states an end state.

- [ ] AC1: The binary produced by `make build`, the container image and the GoReleaser archives
      serve the web UI at `/ui/` with no licence, feature flag or configuration key able to
      disable it, and `GET /` answers `302` to `/ui/`; a binary built without the web step serves
      the placeholder page and fails the e2e suite's first navigation.
- [ ] AC2: `ui` is held in `format-handler-interface.md`'s reserved list: registering a handler
      named `ui`, or one claiming a root-anchored mount under `/ui/` or at exactly `/`, fails
      registration before the server serves any request.
- [ ] AC3: Every response under `/ui/` carries the Content Security Policy, `X-Content-Type-Options`,
      `Referrer-Policy` and `Cross-Origin-Opener-Policy` values in Design, and no response on a
      handler route or under `/api/v1/` carries any of them; the built bundle contains no inline
      script, inline event handler or inline style attribute.
- [ ] AC4: A user completing the OIDC Authorization Code flow with PKCE against the stand-in
      provider lands signed in with a session cookie set HttpOnly, Secure and `SameSite=Lax`, sees their
      display name, and after sign-out the old cookie no longer authenticates any `/api/v1`
      request; with no provider configured, the local admin credential signs in through the same
      route.
- [ ] AC5: A signed-in user browses every registered format: for each format with a conformance
      suite, the e2e suite seeds one package with one version and one file and asserts the
      repository, package and version pages render its coordinate, version, file digest and size,
      and that a format whose surface declaration carries display hints renders description,
      licence and homepage from its document while one without renders the document tree.
- [ ] AC6: Search returns packages from every repository the caller may read and none from any
      other, grouped by format, and an anonymous caller's search returns only packages of public
      repositories.
- [ ] AC7: The setup page for a repository shows one card per recipe family of its format, each
      step rendered with the registry URL, repository and a token placeholder, and the rendered
      text equals byte for byte what `GET /api/v1/repositories/{name}/recipes` returns.
- [ ] AC8: An administrator creates a `remote` repository with its upstream through the UI, the
      repository appears in the listing with its type and upstream, and the snippet copied from
      its setup page, executed verbatim in the harness's client container for that format with a
      token created in the UI, installs a package through the proxy from the fixture upstream
      (charter AC11's flow, end to end).
- [ ] AC9: Deleting a repository requires typing its name, the request carries the identity the
      page loaded, and a repository deleted and recreated under the same name between page load
      and submit is not deleted (the API's `validation` refusal is rendered); an `in-use` refusal
      lists each virtual member by name and the `detach` option is offered only after a second
      confirmation.
- [ ] AC10: Freeze, thaw and rename are performed from the settings page; a frozen repository shows
      its read-only state on every page that names it; renaming a repository whose format declares
      `Rename: unsupported` is refused with the format's reason shown; and a `remote` repository's
      "refresh now" action completes and is recorded as an operation.
- [ ] AC11: The pointers tab lists each pointer with target, write time and reach, flags a pointer
      whose target is outside the retention window with how far it has aged and flags none inside
      it; creating, repointing, rolling back and deleting a named pointer succeed by grant and an
      out-of-reach target renders the API's reach.
- [ ] AC12: The token page meets `credential-management.md` AC23 in a real browser: state and
      `expires_at` on every row, `expiring` distinct from `active` by more than colour, the
      created secret shown once and absent after navigation, browser back and reload, revoke
      moving the row to `revoked`; and the admin's robot page creates, disables and mints.
- [ ] AC13: Every unsafe request the UI sends carries `X-CSRF-Token` matching the `stackweaver_csrf`
      cookie; a cross-site form post to a `/api/v1` write with the session cookie and no header is
      refused and changes nothing; a bearer-token request without the header succeeds.
- [ ] AC14: Actions render from the caller's grants: a principal holding `pull` alone sees no
      write action on a repository, one holding `push` sees publish-class actions and not delete,
      and the admin sees settings, grants and audit; a forged request from the hidden state is
      refused by the API and rendered as its problem.
- [ ] AC15: Navigating to a private repository the caller cannot read and to a repository that does
      not exist renders identical documents (same DOM, same text) after identical request
      sequences, and no page, search or picker reveals a name the caller's listing did not return.
- [ ] AC16: Every API refusal is rendered from its `application/problem+json` body with its
      `title`, `detail`, its type's extension members and the response's `X-Request-Id` with a copy
      action, and no client-side string substitutes for a server refusal.
- [ ] AC17: Every registered format's handler declares a surface with at least one recipe; a
      recipe referencing a variable outside the closed set, or a display hint naming a key type the
      renderer does not know, fails registration; and every declared recipe is named by at least
      one passing conformance case of its format, with a case naming an undeclared recipe rejected
      before any container starts.
- [ ] AC18: The version page renders each file's verdict (verified, failed or absent, with scheme,
      identity and reason), the repository's refusals with rule, advisory or signal and sources
      after the refused blob has been purged, the trust set with keys shown with the fingerprint
      form the ecosystem's client prints, and the operations list with cancel, pause and resume
      succeeding by authorization and refused `not-found` without it.
- [ ] AC19: Markdown from package documents renders with the allowlist only: a README containing a
      script element, an inline event handler, a `javascript:` link and a remote image renders with
      the script and handler removed, the link inert and the image as a link, and the page's CSP
      reports no violation.
- [ ] AC20: Every page in the e2e suite passes axe-core with the WCAG 2.0, 2.1 and 2.2 A and AA rule
      tags in both colour schemes with zero violations, and the AC8 flow completes with the
      keyboard alone with the focused element visible at every step.
- [ ] AC21: The initial route's JavaScript is at most 250 KB compressed and the whole application
      at most 800 KB compressed after every build, enforced in `make verify`.
- [ ] AC22: With 10,000 repositories seeded, the repositories page renders its first page and
      accepts input within 2 s of navigation, and a package with 10,000 versions does the same,
      on the CI runner.
- [ ] AC23: `internal/ui` registers only the static asset routes and the root redirect, imports no
      model, storage, management or handler package, and every request the browser makes during
      the e2e suite has a path under `/ui/` or `/api/v1/`, with the OIDC provider's origin the only
      foreign one and only during sign-in.
- [ ] AC24: The committed `web/src/api/schema.d.ts` equals the one generated from
      `internal/manage/openapi/v1.yaml`, and a UI module calling a path absent from it fails the
      type check.
- [ ] AC25: The pinned-storage view shows every deleted repository awaiting reclamation by
      identity and every out-of-window pointer with its age to the admin, and neither to a
      non-admin, and no page renders a rate, latency or other time series.
- [ ] AC26: The header on every page shows `ui.instance_name` as the instance name and the document
      title, and a help link to `ui.help_url` in the same position on every page, with both keys
      carrying their defaults when unset and neither able to disable the UI.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration + e2e | `internal/ui/serve_test.go` (redirect, fallback, cache headers, placeholder detection); `web/e2e/smoke.spec.ts` against the `make build` binary; `deploy/` image test in `deployment.md`'s packaging suite |
| AC2 | unit | `internal/format/register_test.go` (fixture handler named `ui`, root-anchored `/ui/x`, exactly `/`) |
| AC3 | integration + ci | `internal/ui/headers_test.go`; `web/scripts/check-bundle.mjs` in `make verify` |
| AC4 | e2e + integration | `web/e2e/signin.spec.ts` (OIDC stand-in, local admin, sign-out); `internal/auth/session_test.go` |
| AC5 | e2e | `web/e2e/browse.spec.ts`, table-driven over every registered format's seeded fixture |
| AC6 | e2e | `web/e2e/search.spec.ts` (two principals plus anonymous) |
| AC7 | e2e + unit | `web/e2e/setup.spec.ts` (page text versus API body); `internal/surface/render_test.go` |
| AC8 | e2e | `web/e2e/charter-ac11.spec.ts` (create remote, copy snippet, run in the client container, assert install) |
| AC9 | e2e | `web/e2e/delete.spec.ts` (name typed, identity sent, recreate race, `in-use`, detach) |
| AC10 | e2e | `web/e2e/lifecycle.spec.ts` (freeze, thaw, rename, unsupported rename, refresh now) |
| AC11 | e2e | `web/e2e/pointers.spec.ts` (injected clock for the out-of-window pin) |
| AC12 | e2e | `web/e2e/credentials.spec.ts` (the row `credential-management.md` AC23 names) |
| AC13 | e2e + integration | `web/e2e/csrf.spec.ts`; `internal/auth/session_test.go` |
| AC14 | e2e | `web/e2e/grants.spec.ts` (three principals; forged request) |
| AC15 | e2e | `web/e2e/existence-oracle.spec.ts` (DOM and request-sequence equality) |
| AC16 | unit + e2e | `web/src/components/Problem.test.tsx`; `web/e2e/errors.spec.ts` |
| AC17 | unit + integration | `internal/surface/declaration_test.go` over the registry; `conformance/core/case_validate_test.go` (undeclared id; unexercised recipe) |
| AC18 | e2e | `web/e2e/supply-chain.spec.ts` (verdicts, refusals after purge, trust keys); `web/e2e/operations.spec.ts` |
| AC19 | unit + e2e | `web/src/lib/markdown.test.ts`; `web/e2e/readme.spec.ts` with a CSP violation listener |
| AC20 | e2e | `@axe-core/playwright` fixture in every spec; `web/e2e/keyboard.spec.ts` |
| AC21 | ci | `web/scripts/check-bundle.mjs` in `make verify` |
| AC22 | e2e | `web/e2e/perf.spec.ts` (seeded through the `seed` subcommand) |
| AC23 | architecture test + e2e | `internal/ui/arch_test.go`; `web/e2e/network-audit.ts` fixture |
| AC24 | ci | `make verify` regeneration diff of `web/src/api/schema.d.ts`; `tsc --noEmit` |
| AC25 | e2e | `web/e2e/storage.spec.ts` (admin and non-admin) |
| AC26 | unit + e2e | `internal/ui/config_test.go` (defaults; no disabling key); `web/e2e/header.spec.ts` (name, title, help-link position across every page) |

## Implementation Phases

### Phase 1: Serving, sign-in and the harness (charter step 9 entry)
- `web/` scaffold: Vite, TypeScript, React, React Aria Components, the design tokens, the
  message catalogue, `make web`, `make verify` hooks (AC21, AC24)
- `internal/ui`: embed, SPA fallback, root redirect, headers, placeholder, arch test (AC1, AC2, AC3, AC23)
- Browser sign-in routes with `internal/auth`, session and CSRF in the client (AC4, AC13)
- Playwright harness: compose of binary, PostgreSQL, object store, OIDC stand-in; the network
  audit and axe fixtures; the existence-oracle spec (AC15, AC20 fixture)

### Phase 2: Browsing, search and the surface declaration
- `internal/surface`: declaration types, renderer, registration through `surface.Declarer`,
  the recipes read; `surface.yaml` for every Tier 1 format (AC7, AC17)
- Harness `client.recipe` and the two validator rules (AC17)
- Repositories, search, repository, package, version and setup pages; markdown sanitiser; the
  problem renderer (AC5, AC6, AC16, AC19)

### Phase 3: Administration
- Create repository, settings, freeze, thaw, rename, delete with identity confirmation, virtual
  members, upstream binding, refresh now (AC9, AC10, AC14)
- Pointers and the pinned-storage view (AC11, AC25)

### Phase 4: Credentials, grants and the supply chain views
- Tokens and robots (AC12); grants; upstream credentials
- Trust, keys and fingerprints, verdicts, refusals, operations with controls, audit (AC18)

### Phase 5: The charter flow and the gates
- `charter-ac11.spec.ts` with the real client container (AC8)
- Keyboard traversal, dark scheme axe pass, perf budgets, browser matrix on the main-gated job
  (AC20, AC22)

## Tasks

Left empty by `/spec`. Populated by `/tasks` once the spec reaches `planned`.

## Open Questions

None open. The nine questions this authoring pass raised are resolved below under the owner's
standing delegation, each reversible by the owner.

### Resolved: where the per-format recipes and display hints live (was Q1)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: an embedded
`surface.yaml` in the handler package, exposed through the optional `surface.Declarer` interface,
type-asserted at registration. Folded through Design ("The surface declaration"), AC7, AC17 and the
sibling consequences for `format-handler-interface.md` and `conformance-harness.md`.

The judgment call it settles: the hint requires snippets "generated from the same source as the
conformance client recipes, never hand-written per format", and the pinned method set is five.

**Recommendation (adopted):** A, because it keeps the pinned set at five (the precedent is
`management-api.md`'s optional operation interface), attributes the file to `format:<name>` by the
charter's path rule, and gives both consumers one parsed object.

| Option | You get | It costs |
|---|---|---|
| **A. Embedded `surface.yaml` per handler, optional `surface.Declarer`** | Pinned set unchanged; format cost line; one object for UI and runner | A handler can omit it, caught by AC17 rather than the compiler |
| **B. A field on `Capabilities()`** | No new interface | `Capabilities` becomes a grab bag beyond its two declared exemptions |
| **C. A shared directory of YAML under `internal/surface/formats/`** | One place to look | Every format's file charged to `shared:ui`, corrupting the per-format cost measurement |
| **D. Snippets written in `web/` per format** | Simplest today | Thirty-three untested documents; exactly what the hint forbids |

Accepted cost: registration must fail loudly on a missing or invalid declaration, since nothing
else will.

### Resolved: the component library (was Q2)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: React Aria Components for
interactive primitives, plain CSS with tokens for everything else. Folded through Design ("The
stack") and the accessibility table.

**Recommendation (adopted):** A, because the accessibility criteria are met or missed inside
dialogs, menus, comboboxes and tables, and a library built to the ARIA Authoring Practices carries
that behaviour into every page rather than every page re-deriving it.

| Option | You get | It costs |
|---|---|---|
| **A. React Aria Components plus own CSS** | Accessible widget behaviour by default; no styling opinion imposed | One dependency to track; its widgets styled from scratch |
| **B. A styled component kit (MUI, Chakra)** | Faster first screens | Runtime CSS injection conflicts with the no-inline-style CSP; a visual identity that is theirs |
| **C. Hand-rolled widgets** | No dependency | Every ARIA pattern re-implemented and re-tested; the historical source of most a11y defects |

Accepted cost: the dependency's release cadence becomes ours to follow.

### Resolved: the browser matrix (was Q3)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: Chromium on every run;
Chromium, Firefox and WebKit on the main-gated job that already runs conformance. Folded through
Scope (out of scope) and Design ("Testing strategy").

**Recommendation (adopted):** A, because the constitution's CI economy rule makes per-run minutes a
budget and the main-gated job is where the long suites already live; an engine-specific defect is
still caught before a release, on `main`.

| Option | You get | It costs |
|---|---|---|
| **A. Chromium per run; three engines on the main-gated job** | Fast pull-request feedback; full coverage before release | A Firefox-only defect surfaces after merge, like a conformance defect does today |
| **B. Three engines on every run** | Earliest detection | Triple e2e minutes on every push |
| **C. Chromium only** | Cheapest | WebKit (Safari) never tested; a real share of operators use it |

### Resolved: what an anonymous visitor sees (was Q4)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the UI works unauthenticated
and shows what visibility allows; sign-in is offered, never required, until an action needs a
grant. Folded through Design ("Authentication in the browser", the page inventory) and AC6.

**Recommendation (adopted):** A, because visibility is `auth.md`'s repository setting evaluated by
the API, and a sign-in wall would be a policy that exists only in the UI, which this spec forbids
on principle; a registry that wants nothing public sets no repository public.

| Option | You get | It costs |
|---|---|---|
| **A. Anonymous browsing of public repositories** | One policy (visibility), decided by the API | A public registry's package pages are crawlable, as npm's and PyPI's are |
| **B. Sign-in wall** | Nothing rendered before identity | A UI-only rule; anonymous `pull` still works for clients, so the wall protects nothing |

### Resolved: how deletion is confirmed in the browser (was Q5)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the admin types the
repository name; the client sends the identity it loaded. Folded through the page inventory and
AC9.

**Recommendation (adopted):** A, because `repository-lifecycle.md` AC19 wants the identity in the
request to close the delete-and-recreate race, and the identity the page loaded does exactly that
without asking a human to transcribe an opaque id; typing the name is the deliberate-intent check.

| Option | You get | It costs |
|---|---|---|
| **A. Type the name, send the loaded identity** | Race closed by the API; intent proven by typing | A stale page refused with `validation`, rendered as the problem |
| **B. Type the identity** | Nothing hidden | Transcribing `rep_...` is friction without safety, since the page shows it anyway |
| **C. A checkbox** | Fastest | GitHub, Harbor and Gitea all moved off this for destructive actions; an accidental delete is the failure the lifecycle spec priced highest |

### Resolved: cross-format search (was Q6)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a server-side
`GET /api/v1/search` over package names, scoped to what the caller may read, with an index over
`Package.name` and no new entity. Folded through the page inventory, AC6 and the sibling consequences
for `management-api.md` and `data-model.md`.

**Recommendation (adopted):** A, because a client-side search would have to list every repository
the caller may read on every keystroke, which is slow and, at the edge of the existence oracle,
dangerous; the API already authorizes listings per repository, so a search is a listing with a
predicate.

| Option | You get | It costs |
|---|---|---|
| **A. Server-side search route, indexed name match** | One authorized query; fast; oracle-safe | A new read route and an index |
| **B. Client-side filter over listings** | No API change | Unbounded fan-out; existence-oracle risk in the client |
| **C. Full-text over metadata documents** | Richer results | A search engine dependency for a question nobody asked yet |

### Resolved: rendering package READMEs (was Q7)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: client-side rendering
through an allowlist sanitiser, raw HTML dropped, remote images as links, with the CSP as the
second wall. Folded through Design ("Security headers"), AC19 and the display hints.

**Recommendation (adopted):** A, because `puppet.md` placed rendering with the UI ("a presentation
concern the UI owns"), server-side rendering is the second authorization path Scope rejects, and
plain text throws away the one document users read most.

| Option | You get | It costs |
|---|---|---|
| **A. Client-side, sanitised, no remote images** | Readable READMEs; no server render path; no tracking | Images authors embedded appear as links |
| **B. Server-side render** | Cacheable HTML | A template path beside the API; XSS surface on the server |
| **C. Plain text** | No sanitiser | The most-read document unreadable |

### Resolved: how the binary builds without the web toolchain (was Q8)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a committed placeholder
`index.html` in `internal/ui/dist`, overwritten by `make web`, with every release path building the
frontend first. Folded through Design ("Serving and mounting") and AC1.

**Recommendation (adopted):** A, because `go build` and `go test ./...` must work on a checkout
without Node for the Go-only agent sessions the charter's cost ledger separates, while a build tag
would produce two binaries with different route tables and let the flag-less one ship.

| Option | You get | It costs |
|---|---|---|
| **A. Committed placeholder, overwritten at build** | One binary shape; Go tooling works alone | A dev build can serve the placeholder; AC1 makes the release paths immune |
| **B. Build tag `ui`** | No placeholder | Two binaries; a release built without the tag is silently UI-less |
| **C. Commit the built assets** | Always present | Megabytes of generated files in every diff; the source of truth duplicated |

### Resolved: where the browser sign-in routes mount (was Q9)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `/ui/auth/login`,
`/ui/auth/callback` and `/ui/auth/logout`, mounted by `internal/auth` under the reserved `ui`
segment. Folded through Design ("Position", "Authentication in the browser") and the sibling
consequence for `auth.md`.

**Recommendation (adopted):** A, because the whole browser surface then sits under one reserved
segment, the code stays with the spec that owns the flow, and `/api/v1` keeps its contract of
JSON in and JSON out (a redirect-driven flow does not belong in an OpenAPI document).

| Option | You get | It costs |
|---|---|---|
| **A. Under `/ui/auth/`, mounted by `internal/auth`** | One reserved segment for the browser; API stays pure JSON | `auth.md` names paths under a segment it does not own |
| **B. A second reserved segment `auth`** | Ownership aligned | Another reserved string; the OCI token endpoint already lives elsewhere, so `auth` would be a misnomer |
| **C. Under `/api/v1/auth/`** | One mount | Redirect flows inside the OpenAPI contract; CSRF and cookie semantics leaking into the API's conventions |

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | b98090c | authoring pass: grounded first draft, not a review | Not a review. Gathered the requirements `project-charter.md` (AC11, step 9, its resolved web-UI-criterion decision), `management-api.md`, `credential-management.md` (AC23), `auth.md` (AC2, AC14, AC17, AC22), `repository-lifecycle.md` (AC19), `artifact-verification.md` (AC27), `signing-service.md`, `supply-chain-policy.md` (AC5), `observability.md`, `async-operations.md`, `proxy-cache.md`, `storage-and-gc.md` (AC19), `deployment.md`, `conformance-harness.md`, `format-handler-interface.md` (AC11) and fourteen format specs placed on the web UI; grounded prior art in Gitea, Nexus, pulp-ui, Harbor and WCAG 2.2 by fetch this run (Artifactory's portal returned no text; no claim made). Fixed the embedded serving under a reserved `ui` segment with a strict CSP, the pure-API-client posture with its network audit and architecture test, the surface declaration feeding both the setup page and the conformance runner, the page inventory, the WCAG 2.2 AA table and the Playwright strategy. Nine questions adopted under the standing delegation; zero open; 26 criteria, each with a Test Plan row. Sibling consequences reported to the loop for `management-api.md`, `auth.md`, `format-handler-interface.md`, `conformance-harness.md`, `supply-chain-policy.md`, `deployment.md`, `project-charter.md`, `data-model.md` and `repository-lifecycle.md`. Claim verification vacuous pre-code: no `web/`, no `internal/` exists at b98090c. |
