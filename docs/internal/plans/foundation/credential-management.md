---
status: planned
status_description: "Planned by the Fable recheck of 2026-10-01 at b74dd00: a full review pass over the cloud-authored whole (claim verification of every sibling citation at HEAD, adversarial lens at full strength, constitution compliance) plus the re-examination of the seven questions adopted without Fable. Verdicts: Q1 (robot as a principal owning ordinary tokens), Q2 (admin-only administration), Q6 (stored-and-owned here, presented and verified in auth.md) and Q7 (API only, curl first mint) confirmed; Q3 amended (the lifetime policy as it stands at rotation applies, with an explicit lifetime on rotate; AC11); Q4 amended (the Idempotency-Key lives on the row the write created, matched on the requesting principal, within management.operation_retention; the exchange accepts none; AC16); Q5 amended (one audit line per request past the authorizer, none for an authorizer refusal, per management-api.md's amended rule; the read exception given its reason; the robot, key and trust events re-verified as registered in observability.md; a credential.prune job, exchange-minted tokens pruned at expiry; AC6, AC18). None superseded. Adversarial findings fixed: AC1 asked docker login, npm and pip to run against a generic repository in both modes, where generic has one client (curl) and no proxied path; the human-principal route requirement that AC22 forbids this package to evaluate is now declared to the central authorizer, with row ownership as data scoping under the existence oracle; the owner-bound check at mint is a call into internal/auth's evaluator; the exchange verifies only issuers a trust policy names and makes no outbound request otherwise (the SSRF bound), refuses a scope outside the robot's grants instead of silently narrowing, mints nothing for a disabled or deleted robot, and names an issuer profile (github, gitlab, generic) so the harness's fixture issuer is expressible; the lookup prefix is unique per row since it is the route id; robot deletion is one transaction with one audit line; the robot name grammar is repository-lifecycle.md's; AC24's gc test file corrected to data-model AC34's. Consistent with auth.md as planned on 2026-09-30 (Q22's partial reversal of Q17 and the per-host clients recorded in Context; Q24's recognition scope is the verifier's) and with management-api.md as planned the same day. 25 criteria, each with a Test Plan row; zero open questions; fable_recheck cleared. Five sibling consequences reported (data-model fields, auth's requirement shape and the first-mint Basic form, management-api's authentication paragraph, async-operations' credential.prune kind, artifact-verification's generic-profile refusal). Earlier: closing reconciliation sweep 2026-09-28 at 3135d95 on Opus (not a review): the OIDC exchange tables its format-side bindings, PyPI's (its AC19, the first) and Open VSX's api/-/trusted-publishing/token (openvsx was-Q19, AC33), whose wire shape is still to be captured from ovsx 1.2.0 before the binding is written; a binding is a pure translation onto the exchange, minting nothing itself, held by the existing handler import boundary (new AC25, Phase 3). 25 criteria, zero open questions; stays draft pending a gate review. Earlier: Reconciled 2026-09-28 at 0b79dc8 with the foundation authoring wave (not a review), after the 2026-09-27 grounded first draft. Every sibling consequence this spec reported is now a citation: the four entities live in data-model.md (AC39, meeting AC24's gate), the two problem types are 422 in management-api.md's closed list, the audit line goes through observability.md's Auditor in its registered credential.* vocabulary with the credentials{state,owner_kind} gauge, deployment.md tables the eight keys and the first mint, the harness seeds the expiring token and the registered key (AC25 there), repository-lifecycle.md keeps the tombstone AC20 renders from and deletes grants but never credentials, auth.md cites the robot account and AC34 holds Chef's signed requests, and the robot trust policy doubles as artifact-verification.md's identity source with exchange and attestation bound to one robot (its AC28). Seven questions adopted under the owner's standing delegation, none open; 24 criteria, each with a Test Plan row. Awaits a gate review."
description: "Spec for the credential-management surface: issuing, listing, rotating and revoking registry tokens under /api/v1/tokens, the robot-account principal that lets automation outlive the people who set it up, the expiry states that make a dying token visible before it fails, registered public keys for clients that sign requests, and an OIDC exchange that mints short-lived tokens for CI without a stored secret."
author: michielvha
goal: "Give every user, human or robot, one way to obtain, see, rotate and kill the credential their package client presents, so that no format ships before its users can get a token and no token dies without warning."
priority: "critical"
issue: 45
created: 2026-09-27
covers:
  - "internal/credential/**"
---

# Plan: Credential management

The product surface on top of `auth.md`'s machine identity: where a token comes from, who owns
it, how it is seen to be dying, and how it is killed.

## Context

`auth.md` settles how a registry token is generated, hashed, presented and verified, and
deliberately stops there: its resolved surface-placement decision (was Q21) sends "token
issuance, listing and revocation as a product surface, the expiry-warning criterion, and any
future robot-account principal" to this spec, and its Scope names this file as the spec that
"must reach `planned` before OCI's Phase 1 depends on it" (the "owed and not yet written" wording
it carried until 2026-09-27 is gone; it now cites this file by section). This spec is what that
dependency resolves to, and the requirements it must meet already exist, scattered across the
specs that cite it:

- **`formats/oci.md`** adopted a registry token as the `docker login` credential (its resolved
  docker-login-credential decision, was Q3): the token is the Basic password at the token
  endpoint, the endpoint issues no refresh token, and "token issuance, listing and revocation are
  on this format's critical path", so its Phase 1 depends on this spec reaching `planned` and on
  issuance and revocation being built first. Its AC1 presents one suite credential against two
  repositories (`OCI_NAMESPACE` and `OCI_CROSSMOUNT_NAMESPACE`, read this run from the
  conformance README at tag v1.1.1), which `auth.md`'s resolved two-repository credential
  decision (was Q22) and AC29 already meet with the opt-in multi-repository token; this spec
  issues that token and invents no credential kind for it. The OCI gate was the concrete need
  at adoption; `auth.md`'s Fable recheck of 2026-09-30 recorded a second in its Design: Bundler,
  Julia Pkg, SwiftPM, Vagrant and Composer key one credential per host, so a user of such a
  client reaching two repositories of one format on one host holds either the enumerated opt-in
  token this surface mints or one single-repository token per source URL where the client takes
  userinfo per source; the recipe is each format spec's, the opt-in is `auth.md`'s, and the
  token is minted here (AC7).
- **`auth.md`** fixes the rules this surface may not relax: hash-only storage with a lookup
  prefix (AC6), expiry by default with a deliberate non-expiring opt-in (AC16), several
  repositories only by explicit opt-in with each named by identity (AC29), and a token that never
  exceeds its owner's current grants and carries no administrative authority (AC30). Its "Token
  expiry" section states the criterion this spec owes: "on its surface a token's expiry must be
  visible, and a token nearing expiry distinguishable from a healthy one, before the token
  fails". Its resolved token-authority decision (was Q20) recorded the cost this spec answers: "a
  departing administrator's CI tokens lose their authority with them, so automation should be
  owned by a principal that outlives any one person", and originally added that `auth.md` itself
  defined no robot-account principal and this spec was where one would arrive. Since the
  reconciliation, `auth.md` cites the robot account of this spec's "Robot accounts" and AC9 as
  that principal, and its "Token expiry" cites AC5 here as the criterion that lands the warning.
- **`management-api.md`** holds the reserved `api` segment and states that `internal/credential`
  "mounts `/api/v1/tokens`, `/api/v1/robots` and `/api/v1/keys`" inside that reservation ("Mount,
  versioning and wire conventions"), lists every one of those routes in its endpoint table so its
  OpenAPI test (AC25 there) covers them, and carries this spec's two problem types
  (`scope-exceeds-owner` and `lifetime-policy`, both `422`) in its closed list; it excludes token
  issuance from its own scope and keeps upstream credentials and human grants for itself
  ("Repository administration"). Its wire conventions, RFC 9457 problem types, `Idempotency-Key`,
  `X-Request-Id`, pagination and the audit line, are followed here rather than re-derived. Its
  audit rule as amended on its Fable recheck of 2026-09-30 (resolved audit-record decision, was
  Q5 there; AC23): one line for every unsafe-method request past the shared authorizer under a
  registered event, none from the surface for a request the authorizer refused, reads on the
  request log only, with the read events this spec registers named as the one exception. Its
  authentication paragraph admits the bearer token and the session cookie on `/api/v1` (AC30
  there), while `deployment.md`'s first-mint recipe presents the local admin credential as the
  Basic password; that third form is a seam this recheck reports to both (Review Log).
- **`formats/chef.md`** adopted registered RSA public keys as a second credential kind (its
  resolved publish-authentication decision, was Q1): "A principal registers an RSA public key as
  a credential, through the credential surface `auth.md` assigns to
  `foundation/credential-management.md`", with a non-secret key name that arrives as
  `X-Ops-Userid`, scoped, expiring and revocable exactly as a token is.
- **`formats/terraform.md`** adopted a short-lived download capability minted by `auth.md`'s
  token service and carried in a URL path segment ("The download capability"); **`formats/conda.md`**
  carries a token as a `/t/{token}/` path segment and **`formats/luarocks.md`** as the segment after
  `api/1/`; **`formats/chef.md`** and **`formats/nuget.md`** present tokens in vendor headers. The
  cross-cutting theme these raise is which of it is a credential-management concern and which is
  `auth.md`'s verifier; Scope settles it.
- **`formats/pypi.md`** and **`formats/openvsx.md`** each declined to build their ecosystem's
  trusted-publishing flow (an OIDC identity token exchanged for a registry credential) because
  "credential issuance belongs to the token surface `auth.md` places in
  `foundation/credential-management.md`"; both now serve their client's route as a binding onto
  this spec's exchange (`formats/pypi.md` AC19; `formats/openvsx.md`'s resolved
  trusted-publishing decision, was Q19, AC33, whose route `api/-/trusted-publishing/token` is
  still to be captured), which "OIDC exchange" tables and AC25 holds.
- **`project-charter.md`** builds this at step 2, with generic and the management surface core:
  generic's "clients present registry tokens someone must issue, so the management surface core
  (repository and token operations, the token half being the credential-management surface
  `auth.md` places ahead of OCI) must exist before generic is usable by anyone but the harness".
  The harness itself needs nothing from this surface: its `credentials` setup key is applied by
  the server binary's seed subcommand through the shared layers (`conformance-harness.md`, "The
  seed path"), so a conformance case never calls this API to obtain its token.

The tree holds no code for any of this: `internal/` holds no file and the only Go file is a
stub `cmd/stackweaver-registry/main.go` (listed this run, re-verified at b74dd00). Every file
path below is therefore a design decision, not a description.

### Prior art, and what is taken from it

Read this run, each from the vendor's current documentation.

| System | What it does | Taken | Rejected |
|---|---|---|---|
| **Harbor** robot accounts | System-level and project-level robots; the secret is shown once and "there is no way to get the secret from Harbor after you have created the robot account"; default expiry 30 days, configurable, with a "Never Expired" choice; "Refresh Secret" replaces the secret; robots are deactivated or deleted; names carry the `robot$` prefix; `docker login` takes the robot name and secret | The robot as a principal distinct from a person, holding grants like one; display-once; a rotation that replaces the secret; a distinct disabled state | A per-robot secret that *is* the credential (here a robot owns ordinary tokens, so one robot can hold several, each revocable alone); Harbor's own permission vocabulary, since `auth.md` settled one |
| **GitHub** fine-grained PATs | Expiry optional per token; an organisation policy caps lifetime, default 366 days, and blocks non-compliant tokens rather than revoking them; `GET /orgs/{org}/personal-access-tokens` lists and `POST .../{pat_id}` revokes for administrators | An operator-set maximum lifetime; administrator listing and revocation of everyone's tokens | Blocking a non-compliant token at use instead of refusing it at creation: a lifetime policy is enforced when the token is minted, so nothing is silently dead later |
| **GitLab** PATs | A default expiry of 365 days and an administrator maximum (400 days in 17.6+); expiry emails 60, 30 and 7 days before; the `glpat-` prefix; rotation that creates a token with identical permissions and makes the original inactive immediately; revoked tokens retained for audit; last-used dates and the last five IPs, updated on a coarse schedule | The warning window as a first-class state; rotation as a replacement with identical scopes; retaining revoked rows; coarse last-used tracking | Immediate inactivation of the rotated-out token as the only option: CI needs a grace window to swap a secret (Design, "Rotation") |
| **JFrog** access tokens | Default expiry 3600 s, `token.max-expiry` set by the administrator, expiry 0 meaning non-expiring; refreshable tokens with a 24-hour grace; a `revocable-expiry-threshold` below which a token cannot be revoked; the value is "not stored ... make sure you copy the token" | The administrator-set maximum | Refresh tokens (`formats/oci.md` derived that the token endpoint never issues one, and the same reasoning holds here: a refresh token is a second long-lived secret outside hash-only storage); a non-revocable class of token, since `auth.md` AC5 promises revocation on the next request on every path but the OCI JWT |
| **Sonatype Nexus** user tokens | A two-part name-code and pass-code; administrator-configurable expiry of 1 to 999 days, default 30; users and administrators reset tokens, administrators all at once; the dialog closes after one minute and the value is never redisplayed | Nothing beyond what the others already give | One token per user (a user with one credential for every client cannot scope or revoke selectively) |
| **npm** granular tokens | Only granular tokens since November 2025; a minimum lifetime of one day; up to 50 packages or scopes per token; "tied to users' permission; hence it cannot have more permission than the user at any point in time"; 1000 tokens per account | The owner-intersection rule, which `auth.md` AC30 already fixes, confirmed as the industry direction | IP allowlists (a network control this spec does not own) |
| **Docker Hub** access tokens | Read, write and delete scopes; an expiration date set at creation and not editable afterwards; deactivate distinct from delete; last-used tracking; organisation access tokens "aren't tied to individual user accounts" | An expiry fixed at creation; the organisation token as the same need the robot account meets | A separate token kind for organisations: a robot-owned token is that |
| **PyPI** trusted publishing | An OIDC identity token from CI is verified and exchanged for "a short-lived (15 minute) PyPI API token"; claims are matched against a registered publisher including `repository_owner_id` to defeat account resurrection; the `pypi-` prefix exists so GitHub secret scanning can recognise leaked tokens; a two-phase exchange was chosen to keep one authentication code path | The exchange shape: a verified identity token buys an ordinary short-lived registry token, so every downstream path stays the one `auth.md` specifies; a fixed brand prefix for secret scanning; matching on an immutable identifier as well as a name | Minting a token scoped to "every project with a matching publisher" implicitly: here the exchange mints inside a named robot's grants and no wider |
| **Zitadel** service users | A machine principal with only a name, description and username, authenticating by PAT or JWT profile, never by password or MFA | The definition of the robot principal: no login, no email, no session | Making the IdP issue registry tokens: `auth.md` established that 33 package clients cannot present an IdP's token |
| **Gitea** | Personal access tokens with `package` read or read-and-write permission are the Basic password for every package registry | Confirms the token-as-password convention `auth.md` already carries | Nothing further; the page read says nothing on expiry or display |
| **Pulp** | Not grounded this run: both documentation URLs tried answered 404. No claim about Pulp is made here | | |

## Scope

**In scope**

- **Registry tokens as a product**: create (issue), list, read, rotate and revoke, under
  `/api/v1/tokens`, for the token `auth.md` defines and every format's client presents. Display
  once; hash-only storage per `auth.md` AC6; expiry per AC16; multi-repository opt-in per AC29;
  owner intersection per AC30. This spec may not relax any of those (`auth.md`, the resolved
  surface-placement decision, was Q21).
- **Expiry states**: `active`, `expiring`, `expired` and `revoked`, so a token nearing expiry is
  distinguishable from a healthy one before it fails, which is the criterion `auth.md` owes to
  this spec (AC5 here).
- **Robot accounts**: a principal kind for automation that no person's departure affects,
  holding grants in `auth.md`'s vocabulary and owning tokens like any principal, under
  `/api/v1/robots`.
- **Registered public keys**: the second credential kind `formats/chef.md` adopted, under
  `/api/v1/keys`: an RSA public key with a non-secret key name, scoped, expiring and revocable
  like a token. Registration and lifecycle are here; verifying a signed request is `auth.md`'s.
- **OIDC exchange for CI**: a verified identity token from a configured trusted issuer,
  matched against a robot's trust policy, buys a short-lived ordinary token owned by that robot,
  under `/api/v1/tokens/exchange`. This is what `formats/pypi.md` and `formats/openvsx.md`
  declined to build per format.
- **The audit trail** of every credential event, on `management-api.md`'s audit line, and the
  retention of revoked rows so the listing shows what was killed and by whom.
- **Configuration** for lifetimes, the warning window, rotation grace and retention, as a typed
  `Config` following the vendored `cobra-viper` skill.
- **The UI surface** at charter step 9: the token list with its states, creation with the
  display-once secret, revocation, robot administration. Specified here so the Playwright rows
  exist; built when the UI is.

**Out of scope**, each with a reason that is not effort:

- **How a credential is presented and verified.** Bearer, Basic, Galaxy's `Token`, Cargo's
  scheme-less value, conda's `/t/{token}/` and luarocks's `api/1/{key}` path segments, the
  `X-Jfrog-Art-Api`, `X-NuGet-ApiKey`, `X-ApiKey` and `X-OpenVSX-Token` headers, Chef's signed
  headers: every one is a way of carrying a credential this spec issued, and the verifier that
  resolves each to the same principal and scopes is `auth.md`'s (its AC31 and the client table),
  as are the redaction of each (its AC7, `conformance-harness.md` AC13) and the plaintext refusal
  (AC27). A presentation form is a verifier concern because the security property, "the same
  token, the same principal, whatever the form", is only checkable at the verifier. This spec
  owns what is issued and the fact that its value is form-agnostic (AC3), never how it travels.
  The resolved presentation-forms decision below (was Q6) records this.
- **The OCI JWT and Terraform's download capability.** Both are minted by `auth.md`'s token
  service, live for minutes, are never stored and are revoked only by expiry (`auth.md` AC5,
  `formats/terraform.md`, "The download capability"). They are not credentials a person owns,
  lists or revokes, so nothing here applies to them. The resolved presentation-forms decision
  says why the boundary is "stored and owned" rather than "minted by us".
- **Human grants and upstream credentials.** `management-api.md` administers both ("Repository
  administration"): grants because they are authorization, not credentials; upstream
  credentials because they are secrets the registry presents, not secrets it issues.
- **User management.** No user CRUD, password, MFA or recovery: `auth.md` outsources human
  identity to the identity provider. A robot is not a user; it has no login at all.
- **A CLI in v1.** `management-api.md`'s resolved API-first decision (was Q9) applies to this
  surface as it does to that one (the resolved surface-shape decision below, was Q7): the API
  and its OpenAPI document are the contract, and a CLI is a later client of it. The cost is a
  `curl` to mint the first token, named in that record.
- **Delegated robot administration.** In v1 only the global admin creates robots, grants them
  authority and mints their tokens, because `auth.md` gives its vocabulary no "may manage"
  action and its Scope names delegated grant administration out of scope; a per-robot
  manager right would be that fourth action, raised as a change to `auth.md`'s vocabulary and
  never stretched out of `admin` here (the resolved robot-ownership decision below, was Q2).

## Design

### What a credential is, and who owns it

Three nouns, all of which `auth.md` already uses and none of which it makes an entity of:

- A **principal** is what authorization is evaluated for. `auth.md` has two: a human, keyed on
  the provider's `(issuer, subject)` or the local admin account, and the anonymous principal.
  This spec adds the third, the **robot**: a principal with a name, a description, a
  created-by record and an enabled flag, and nothing else. No email, no password, no session,
  no login route. It exists to hold grants and own credentials, so that automation is not
  owned by a person (`auth.md`, the resolved token-authority decision, was Q20; Zitadel's
  service user, above).
- A **credential** is a stored, owned thing a client presents. Two kinds exist: the **token**
  (`auth.md`'s 256-bit random value, stored as a SHA-256 hash plus a lookup prefix) and the
  **registered public key** (an RSA public key under a non-secret name, stored as is because a
  public key is not a secret). Every credential has an owner principal, a display name, a set of
  scopes, a creation time, an expiry (or the explicit non-expiring mark), an optional revocation
  record, and a coarse last-used time. A credential's authority on any request is the
  intersection of its scopes with its owner's current grants (`auth.md` AC30), evaluated by the
  central authorizer; this spec never evaluates authorization itself (AC22).
- A **grant** is `auth.md`'s `(principal, repository, action)` with an optional pattern,
  administered through `management-api.md`. A robot receives grants exactly as a human does,
  through that surface, and holds none when created (`auth.md` AC14's rule applied to the new
  kind, AC8 here).

**Entities are owned by `data-model.md`**, per the constitution, and that spec now carries all
four in "Principals, credentials and grants" and asserts them in its AC39 (applied 2026-09-27;
when this spec was authored its table ran from `Repository` to `Operation` with no principal,
credential or grant row, which is why AC24 here gates code on their presence, a condition now
met). The shapes this spec needs and that section records: `Principal` (kind `human` | `robot`,
identity key or robot name, display fields, enabled flag), `Credential` (kind `token` |
`public-key`, owner ref, name, lookup prefix and hash or public key and fingerprint, scopes as
`(repository identity, actions, pattern)` rows with the multi-repository mark, created, expires
or non-expiring, revoked at and by, rotated-from ref, last used), `Grant` (as `auth.md` states
it) and `TrustPolicy` (robot ref, issuer, audience, claim constraints). The Fable recheck of
2026-10-01 found four fields the surface needs that the section does not yet carry, reported to
`data-model.md` rather than edited there: `created_by` and the idempotency triple (key, payload
digest, requesting principal) on `Credential`, the same triple and `deleted_at` on `Principal`,
a unique index on the token lookup prefix, and the issuer profile on `TrustPolicy`. None
references a blob or a snapshot, so none is a GC mark root and each sits in "Records that are
not mark roots". A
credential scope references a repository by identity and tolerates that repository's deletion:
the row stays readable, the listing renders the repository's last name from the tombstone
`repository-lifecycle.md` keeps forever (its AC24; `data-model.md` AC39), and the scope grants
nothing (`auth.md`, the identity-binding rule). Deleting a repository deletes its **grants** in
the deletion transaction and touches no **credential** (`repository-lifecycle.md`, "Deletion"
step 9, AC23), which is what lets AC20 here hold without this surface doing anything at deletion
time.

### The token surface: `/api/v1/tokens`

Mounted inside `management-api.md`'s reserved `api` segment, versioned as `/api/v1`, served by
`internal/credential`, and following that spec's wire conventions without exception: JSON
bodies, `X-Request-Id` echoed or generated, RFC 9457 `application/problem+json` refusals from
its closed type list, `Idempotency-Key` on writes, `limit` plus opaque `cursor` pagination with
`Link: rel="next"`, and the existence oracle (a token the caller may not see answers
`not-found`, identically to one that does not exist; `auth.md` AC17).

| Route | Action | Who | Effect |
|---|---|---|---|
| `POST /api/v1/tokens` | create | any authenticated human session, for a token they own; the admin, for a token any principal owns (`owner` is a principal reference: a robot's name, or a human's principal id as `GET /api/v1/session` reports it) | Validates every scope against the grammar (`auth.md` AC25), the owner's current grants (AC30) and the lifetime policy; mints the value; stores hash and prefix; records the creating principal beside the owner (`created_by`), so an admin minting for another principal is distinguishable from the owner minting; answers `201` with the row and, exactly once, `secret` |
| `GET /api/v1/tokens` | list | a session sees its own; the admin sees every token, filterable by `owner` | Rows without secrets; each carries `state`, `expires_at`, `last_used_at`, `created_by`; filters `state`, `owner`, `expiring` |
| `GET /api/v1/tokens/{id}` | read | owner or admin; anyone else answers `not-found` | The row |
| `POST /api/v1/tokens/{id}/rotate` | rotate | owner or admin; anyone else answers `not-found` | Mints a replacement with identical name, owner, scopes and multi-repository mark, under the lifetime policy as it stands at rotation; the original's expiry is shortened to now plus `grace` (Design, "Rotation"); `201` with the new row and its `secret` once |
| `DELETE /api/v1/tokens/{id}` | revoke | owner or admin; anyone else answers `not-found` | Marks the row revoked with who and when; `204`; the row is retained and listed as `revoked` for the retention window |
| `POST /api/v1/tokens/exchange` | exchange | unauthenticated on the wire; the request body's identity token is the credential | Design, "OIDC exchange" |

**Who** is a human session or the admin role, never a token: a token carries no administrative
authority and cannot mint, list or revoke tokens, because `auth.md`'s scope vocabulary has no
action for it (AC30, "no token ... can perform an administrative action"). The one route a
token-bearing request reaches is none of these. A robot therefore never manages its own
credentials; the admin does (the resolved robot-ownership decision below, was Q2).

**How "who" reaches the authorizer**, stated on the Fable recheck because AC22 forbids this
package to decide it. `auth.md`'s vocabulary has two route requirements today, a `(repository,
action, object)` scope and the admin role; these routes need a third, **a human principal**: a
session, or the local admin account, and never a token, whatever the token's owner holds. Each
route here declares that requirement beside its mapping exactly as `management-api.md`'s admin
routes declare theirs, and the central authorizer evaluates it, resolving a presented token into
its principal first (so `management-api.md` AC30's "accepts the bearer token through the same
authorizer" holds) and then refusing it `unauthorized` (AC14). A robot has no session, so it
never satisfies the requirement. What remains after the authorizer is **data scoping**, not
authorization: a session's listing is filtered to the rows it owns, and a read, rotate or
revoke of a row the caller does not own answers `not-found` under the existence oracle. The
requirement shape is `auth.md`'s to carry (reported as a sibling consequence; it belongs on its
AC10 review surface), and `internal/credential/arch_test.go` holds that no code here reads a
`Grant` row or a principal's kind to decide anything (AC22). The same rule covers the
owner-bound check at mint: "every requested scope is held by the owner's current grants" is a
question this package asks `internal/auth`'s evaluator through its consumer interface, never
answers itself.

**`id`** is the lookup prefix, so the identifier a user sees in the listing is the same string
they see at the start of the token in their CI secret, and nothing else is needed to match the
two. That makes the prefix a route key, so it is **unique per row**: a unique index holds it
(`data-model.md`, reported), and the issuer regenerates on the rare collision rather than
returning a duplicate.

**The token value** is `auth.md`'s: at least 256 bits from `crypto/rand`, no structure beyond
a non-secret prefix. This spec fixes the prefix's shape, because the surface displays it: the
fixed brand marker `swr_` followed by the lookup prefix, then the secret, all base32 without
padding so the whole value survives every client's configuration file and URL path segment
(conda's and luarocks's forms carry it in a URL). The fixed marker exists for the reason PyPI's
`pypi-` does, so that secret-scanning tooling can recognise a leaked value; it grants nothing
and parses to nothing.

**Display once.** The `secret` member appears in exactly one response, the `201` to the
creating or rotating request, and never again: not in the listing, not in a read, not in the
audit line, not in an `Idempotency-Key` replay (the resolved replay decision below, was Q4).
`auth.md` AC6 makes this the only possible behaviour, since the server holds no secret to
return; this spec asserts it on its surface (AC4) so the convention is tested where a
convenience could break it.

**Where the `Idempotency-Key` lives.** `management-api.md` stores the key on the `Operation`
record and this surface writes none (the resolved audit-shape decision below, was Q5), a gap
the Fable recheck closed rather than leaving to the implementer: a write here that carries the
key stores the key, a digest of the request payload and the requesting principal **on the row it
created**, the `Credential` for a create, a rotate or a key registration and the `Principal` for
a robot create (`data-model.md`, reported). A repeat is matched on `(requesting principal, key)`,
never on the key alone, so one principal's key can never replay another's row; within
`management.operation_retention`, the same window the management API uses, a match with the
same payload digest returns the original row without `secret` (AC16), and a different digest is
refused `idempotency-key-reuse`. `DELETE`, `PATCH` and `PUT` here are idempotent by their own
semantics and ignore the header. The exchange route accepts no key at all: a retry is a new
exchange minting a new short-lived token, bounded by the identity token's own expiry, and a
replay that returned a row without its secret would serve nothing a CI job could use.

### Scopes, and the four rules this surface obeys

A request to create a token carries its scopes as `auth.md` states them: one or more
`(repository, actions, pattern)` entries, the repository named by its current name and
resolved to its identity at creation, the pattern validated against the grammar and refused
outside it (`auth.md` AC25, exercised through this route). Then:

- **Expiry by default** (`auth.md` AC16). A request naming no `expires_at` receives the
  configured default lifetime. A lifetime beyond the configured maximum is refused
  `lifetime-policy`. `non_expiring: true` is the deliberate opt-in the rule requires, honoured
  only when the operator has not disabled it, and refused `lifetime-policy` otherwise; the
  refusal names the policy so the user learns the rule rather than guessing.
- **One repository unless opted in** (`auth.md` AC29). Scopes on two repositories are refused
  `validation` unless `multi_repository: true` is set; with it, every repository is named by
  identity (a pattern or wildcard where a repository name belongs is refused), and the token
  is honoured only on the repositories named. This is the token `formats/oci.md` AC1's suite
  credential is (AC7 here).
- **Never wider than the owner** (`auth.md` AC30). Every requested scope must be held by the
  owner's current grants, pattern included; one scope outside them refuses the whole request
  `scope-exceeds-owner`, naming the offending scope. The admin minting a token for a robot is
  bound by the robot's grants, not the admin's: a robot with no grants can be issued no token,
  which is what makes "grant first, then mint" the onboarding order (AC8). The OIDC exchange
  obeys the same rule for the scopes it is asked for, refusing rather than silently narrowing
  (Design, "OIDC exchange", step 4), so a misconfigured CI job fails at the exchange with the
  scope named, not at its first upload with a `403`.
- **Hash-only storage** (`auth.md` AC6). This surface calls `internal/auth`'s issuer to mint and
  hash; it never sees a hashing primitive of its own (AC22's architecture test).

`scope-exceeds-owner` and `lifetime-policy` are the two problem types this surface contributes
to `management-api.md`'s closed list, where both are recorded with status `422` (the list is that
spec's contract, and it carries them since the reconciliation). Each other refusal uses an
existing type: `validation` (`422`) for a bad pattern or an un-opted multi-repository request,
`not-found` under the existence oracle, `unauthenticated` and `unauthorized` as the central
authorizer answers, `conflict` (`409`) for a duplicate robot or key name,
`idempotency-key-reuse` and `operation-outstanding` as `management-api.md` defines them.

### Expiry states: making a dying token visible

Every token row carries a derived `state`, computed at read time from the row and the clock,
never stored, so it can never be stale:

| State | When | What the client sees |
|---|---|---|
| `active` | not revoked, and expiry is later than now plus the warning window, or the token is non-expiring | authenticates |
| `expiring` | not revoked, and expiry is within the warning window | authenticates, exactly as `active`; the listing and the read say `expiring` and carry `expires_at` |
| `expired` | expiry has passed | refused with an authentication error, never anonymous (`auth.md` AC12) |
| `revoked` | a revocation record exists | refused on the next request (`auth.md` AC5) |

The warning window is `credentials.expiry_warning_window`, 14 days by default (GitLab warns at
7, 30 and 60 days; a fortnight is one sprint of notice). The listing takes `expiring=true` to
return only rows in that state, which is the query a dashboard, a nightly job or a person runs
to find what is about to break. `expires_at` is on every row in every state, so the exact time
is visible and not only the state. This is the criterion `auth.md`'s "Token expiry" owes: expiry
visible, and near-expiry distinguishable from healthy, before the token fails (AC5).

Two more signals ride on the same derivation, each owned elsewhere and named here so they get
built: the gauge `credentials{state,owner_kind}` (`stackweaver_registry_` namespace; `state` over
the four values above, `owner_kind` over `user`, `robot`, `admin`) that `observability.md`'s
catalogue lists and its AC6 asserts, state-derived and exported by the process holding scheduler
leadership (its AC7), with the informational alert `CredentialsExpiring` on
`credentials{state="expiring"} > 0`; and the UI badge at step 9 (AC23). This package computes
the gauge from the same derivation the listing uses, through the instrument `observability.md`
exports, and proves it moves in `internal/credential/metrics_test.go` on that spec's
`telemetry.NewTestRecorder` (AC5). An email is not sent: the registry has no mail path and
`auth.md` outsources everything with one to the identity provider.

**A revoked or expired token stays listed** for `credentials.revoked_retention`, 90 days by
default, the same window as `management.operation_retention`, so the person whose pipeline
broke can see that their token was revoked, when, and by whom, rather than seeing it vanish.
After the window the row is pruned by a `credential.prune` job on `async-operations.md`'s
runner, one daily `Schedule` with the kind as its exclusivity key and no configuration key of
its own (the window is the key above; the kind is reported to that spec's table); the audit
line survives the prune, as `management-api.md`'s does. **One class is exempt from the listing
window**: a token minted by the OIDC exchange is pruned at its expiry, since a fifteen-minute
token retained for ninety days is not history anyone reads but noise that would bury a busy
robot's listing under thousands of `expired` rows, and its `credential.exchange` audit line is
the record. A revocation before its expiry is retained like any other, because that is the
case someone will want to read.

### Rotation

`POST /api/v1/tokens/{id}/rotate` mints a new token with the original's name, owner, scopes and
multi-repository mark, records the original as the new row's predecessor, and sets the
original's expiry to now plus `grace`. The new expiry defaults to the original's lifetime
counted from now, or non-expiring if the original was, and the request may instead carry
`expires_at` or `non_expiring` exactly as a create may. Either way the **policy as it stands at
rotation** applies (Design, "Configuration": a lifetime policy is enforced at creation and
rotation only): a default that now exceeds `max_token_lifetime`, or a non-expiring default under
`allow_non_expiring: false`, is refused `lifetime-policy` naming the rule, and the caller
rotates again with an explicit lifetime inside it. That is how an operator who tightens the
policy retires the old long-lived tokens without revoking them: each rotation lands inside the
new rule (AC11). `grace` defaults to zero,
which is GitLab's immediate inactivation, and may be raised to `credentials.rotation_max_grace`,
24 hours by default, so that a CI system whose secret store propagates slowly can hold both
values for a bounded time. Nothing new is invented to express the overlap: the old token simply
expires early, and its state shows `expiring` until it does. The `expired` predecessor stays
listed under retention, linked to its successor, so the chain is visible.

A non-expiring original rotated with a grace becomes an expiring one; that is the point.

### Revocation

`DELETE /api/v1/tokens/{id}` writes the revocation record (time and revoking principal) and
answers `204`. The next request presenting the token is refused (`auth.md` AC5), because the
verifier reads the row on every request, with the one window `auth.md` names: an OCI JWT the
token already bought stays valid to its minutes-scale expiry. Revocation is idempotent, so a
second `DELETE` is `204` again. Revoking never deletes: the row is retained as `revoked` for
the retention window (AC6). A revoked token cannot be un-revoked or rotated; the user mints a
new one, which is the "deliberately inconvenient" posture `auth.md` states under "Tokens are
never stored recoverable".

**Bulk revocation** exists in two forms that fall out of the model rather than being added:
disabling a robot (below) refuses every credential it owns on the next request without touching
their rows, and the admin's listing filtered by `owner` is the "revoke everything this person
has" procedure, one `DELETE` per row.

### Robot accounts: `/api/v1/robots`

| Route | Who | Effect |
|---|---|---|
| `POST /api/v1/robots` | admin | Creates a robot principal with a unique `name` under `repository-lifecycle.md`'s name grammar (the same character set and reserved words, so nothing new is invented and no robot is named `api`; `conflict` on a duplicate, including a name a deleted robot held: robot names are never reused, so a grant or audit line naming one is never ambiguous) and a `description`; holds no grants and owns no credentials |
| `GET /api/v1/robots`, `GET /api/v1/robots/{name}` | admin | Rows with enabled flag, created by and when, credential count, and grant summary as `management-api.md`'s grant listing renders it |
| `PATCH /api/v1/robots/{name}` | admin | `description`; `enabled: false` disables the robot, and every credential it owns is refused on the next request while its rows stay intact, and the exchange mints nothing for it; `enabled: true` restores them |
| `DELETE /api/v1/robots/{name}` | admin | In one transaction: revokes every credential the robot owns, deletes its `Grant` rows and its trust policy, and sets `deleted_at` on the principal (`data-model.md`, reported); the name stays reserved. The grants go the way `repository-lifecycle.md`'s deletion removes a repository's (in the deletion transaction, through the shared model, never through `internal/manage`), so the request emits its one `credential.robot.delete` line carrying the count of grants removed and no `manage.grant.delete` lines |
| `PUT /api/v1/robots/{name}/trust`, `GET`, `DELETE` | admin | The robot's trust policy for OIDC exchange (below): one policy per robot, so a robot exchanged from two issuers is two robots, which keeps a policy's identity the robot's |

A robot's authority is its grants and nothing else (`auth.md` AC14 and AC30 apply unchanged:
the new principal kind changes no evaluation rule, AC8 here). It cannot log in, has no session,
and appears in the OIDC flow nowhere. It answers the departing-owner cost exactly as `auth.md`
Q20's record asks: a token owned by a robot loses nothing when the administrator who created
the robot is removed, because the intersection is with the robot's grants, not the creator's
(AC9). What it costs is stated in the resolved robot-ownership decision (was Q2): in v1 the admin
alone administers robots and their tokens.

Harbor's `robot$` prefix is not adopted. A robot's name is any name the principal namespace
accepts, and the listing marks the kind; the prefix in Harbor exists because a robot logs in
by name as a `docker` username, and here the username is not an authentication input
(`auth.md`, the Basic-form semantics).

### Registered public keys: `/api/v1/keys`

The second credential kind, adopted by `formats/chef.md` because knife signs every write with
the client's RSA key and has no field a token could travel in.

| Route | Who | Effect |
|---|---|---|
| `POST /api/v1/keys` | a session, for a key they own; the admin, for any owner | Body: `name` (the key name; unique on the instance, immutable, non-secret, what knife sends as `X-Ops-Userid`), `public_key` (a PEM-encoded RSA public key, SPKI or PKCS #1, at least 2048 bits; anything else refused `validation`), scopes and expiry exactly as a token's, under the same four rules. Answers `201` with the row, including the key's SHA-256 fingerprint; there is no secret to display once |
| `GET /api/v1/keys`, `GET /api/v1/keys/{name}` | owner or admin | Rows with state, `expires_at`, fingerprint, `last_used_at` |
| `DELETE /api/v1/keys/{name}` | owner or admin | Revokes; retained and listed as `revoked` |

A key has no rotate route: rotating a key pair is generating a new pair on the client and
registering the new public key under a new name, so `POST` then `DELETE` is the rotation. The
verification of a signed request, the canonical string, the protocol versions and the replay
window are `formats/chef.md`'s design and `auth.md`'s verifier (its AC34, inside AC10's external
review scope); this spec stores the key and its lifecycle and reports `X-Ops-Userid`'s
resolution as one lookup by name (AC12).

### OIDC exchange: `/api/v1/tokens/exchange`

The way CI obtains a token without anyone storing one, taken from PyPI's trusted publishing and
generalised so no format builds its own. A robot's **trust policy** names an OIDC issuer URL,
the issuer's **profile** (`github`, `gitlab` or `generic`: a row of this package's trusted-issuer
table, a closed Go table that fixes which claims a policy under that profile must constrain and
how its claims map onto a certificate identity, below), the audience the identity token must
carry, and a set of claim constraints as exact values (`repository`, `repository_owner_id`,
`workflow`, `environment` for GitHub Actions; the equivalent for GitLab CI; whatever the
operator names under `generic`, which is also what lets the harness's fixture issuer be
trusted). The issuer URL is data, so any compliant issuer can be named without a code change;
the profile is code, because the required-claim rule is a security judgment per issuer, not
configuration. The exchange:

1. Receives `{ "id_token": ... }` with no other credential; the route is one of the
   credential-bearing paths, so `auth.md` AC27's plaintext refusal applies to it.
2. Reads the unverified `iss` claim and **proceeds only if some trust policy names that
   issuer**; otherwise the request is refused `unauthenticated` before any outbound request is
   made. This is the bound that keeps an unauthenticated route from being a fetch-any-URL
   primitive: the registry contacts an issuer's discovery and key endpoints only for issuers an
   administrator has named, through the same `coreos/go-oidc` client and outbound path
   `auth.md`'s human login uses. It then verifies the identity token against that issuer's
   published keys, checking signature, issuer, audience and expiry, and nothing hand-rolled
   ("Nothing is invented" holds; AC22's architecture test).
3. Finds the trust policies whose issuer and audience match, then requires every claim
   constraint of exactly one policy to match exactly. Two matching policies is a configuration
   error refused `conflict` (the `PUT` already refuses `conflict` a policy identical in issuer,
   audience and constraints to another robot's, so only an overlap of constraint sets reaches
   this); none, or a match whose robot is disabled or deleted, is refused `unauthenticated`,
   never anonymous. Every refusal on this route is an authentication error to the caller and a
   `credential.exchange` line with `problem_type` and `issuer` to the operator.
4. Mints an ordinary token owned by the matched robot, with the scopes the request asks for
   (or the robot's full grants if it asks for none), under the four rules of "Scopes" exactly
   as a create is: a requested scope outside the robot's grants refuses the whole exchange
   `scope-exceeds-owner` naming it, never a silently narrowed token; a lifetime of
   `credentials.exchange_token_lifetime`, 15 minutes by default and capped at one hour;
   `non_expiring` is refused on this route whatever the policy says.
5. Answers `201` with the row and its `secret` once, exactly as a create does. The token is a
   row like any other: listed under the robot, revocable, audited, refused after expiry, and
   pruned at that expiry rather than retained (Design, "Expiry states"). Every downstream path
   is the one `auth.md` specifies, which is the reason PyPI gave for its two-phase design and
   the reason here.

`repository_owner_id` or its equivalent is required in a GitHub policy, not optional, because
matching on a repository name alone is the account-resurrection hole PyPI closed; the trust
policy validator refuses a GitHub-issuer policy that omits it (AC13). The exchange route, the
trust-policy routes and the key routes sit inside `auth.md` AC10's external review scope, which
that spec states and this one repeats so no implementer reads "product surface" as "outside the
security review".

**The trust policy is also an identity source for verification.** `artifact-verification.md`
reuses this policy shape rather than defining a second issuer model (its resolved
identity-policy decision, was Q10): a repository's `identity-policy` entry may reference a robot,
and the expected Sigstore certificate identity is then derived from that robot's trust policy
(for GitHub Actions, `repository` and `workflow` yield the workflow URI the certificate's SAN
carries and `repository_owner_id` is checked against the certificate's owner extension). The
consequence that binds here: an upload authenticated by a token minted through this exchange
must carry an attestation whose identity derives from the **same** robot's policy, and a
mismatch is refused `identity-mismatch` before commit (`artifact-verification.md` AC28), which
closes the hole where a CI job exchanges as robot A and attests as workflow B. To make that
derivation possible without `internal/verify` reading this package's tables, the exchange
records the minting robot on the token row (the `owner` it already has) and this package exposes
the robot's trust policy through the small consumer interface `internal/verify` declares at its
point of use. The claim-to-certificate-identity mapping is profile-specific and lives on the
profile's row of this package's trusted-issuer table (the same row that says
`repository_owner_id` is mandatory under `github`), not in a fixed table of either spec; adding
a profile adds one row carrying its required claims and its mapping, and a policy under
`generic` derives no certificate identity, so an `identity-policy` entry referencing such a
robot is refused at the trust-set write (AC13; `artifact-verification.md`, reported).

The exchange is Phase 3, after OCI: no Tier 1 client needs it to run, and its first consumers
are format-side bindings, each a format-shaped route the ecosystem's client calls, translated by
the handler into this exchange and nothing else, so there is one exchange however many ways in:

| Format | Binding route | Wire shape | Criterion |
|---|---|---|---|
| PyPI | the token-mint route PyPI's publishing clients call (`formats/pypi.md`, "Trusted publishing is a binding onto the OIDC exchange") | as that spec records it | `formats/pypi.md` AC19, the first binding |
| Open VSX | `api/-/trusted-publishing/token`, which ovsx 1.2.0 calls in trusted-publishing mode (`formats/openvsx.md`'s resolved trusted-publishing decision, was Q19; its "Trusted publishing is a binding onto the OIDC exchange") | **not yet captured**: the authoring pass recorded no ovsx 1.2.0 exchange, so the request and response shape is grounded in a capture against the pinned reference server before the binding is written (its Phase 2's first step, a local capture needing ovsx 1.2.0 in a container); nothing here assumes it | `formats/openvsx.md` AC33 |

What every binding inherits from this route, whatever its wire shape (AC25): the identity token
it forwards is verified and matched exactly as steps 1 to 4 state, the token it returns is minted
here and nowhere else, a binding never mints, caches or widens a token itself, and a request
matching no trust policy is refused with nothing minted. A binding is served only on a hosted
repository; against a remote or virtual it answers `405` as the format's other write routes do.

### Last used

Each verification updates the credential's `last_used_at` no more than once per
`credentials.last_used_resolution`, 10 minutes by default (GitLab's cadence), and does so off
the request path through a bounded worker that the server's shutdown drains, never a write per
request: a `docker pull` is hundreds of verifications and a synchronous write on each would
undo the reason `auth.md` chose SHA-256 over bcrypt. The value is therefore coarse by design and
the listing says so in its field documentation. A last-used time is what lets an administrator
find the tokens nobody uses, which is the population most worth revoking.

### Audit

Every request that reaches this surface past the shared authorizer, completed or refused by
this surface, emits exactly one of `management-api.md`'s structured audit lines, written
through `telemetry.Auditor.Emit` (`observability.md`, "The audit channel": the only way onto the
channel, which checks the event against the closed vocabulary and the attributes against the
event's registered extension set), with the fixed attribute set that spec names (`event`,
`request_id`, `trace_id`, `principal`, `principal_kind`, `client_address`, `outcome`,
`problem_type` on a refusal) plus this surface's registered extension attributes: `credential`
(the lookup prefix or key name, never the value), `owner`, `owner_kind`, `multi_repository` and,
on an exchange, `issuer`. A request the authorizer refuses before it reaches this surface (no
credential, an invalid one, a token where a human is required, the existence oracle) is audited
by `auth.md`'s own events and produces nothing here, so a refused write never yields two lines;
the audit rule is `management-api.md`'s as amended on its Fable recheck of 2026-09-30 (its AC23),
followed here rather than re-derived. Events, in the vocabulary's `<subsystem>.<object>.<action>`
grammar: `credential.token.create`, `.rotate`, `.revoke`, `.read`, `.list`;
`credential.robot.create`, `.update`, `.delete`, `.read`, `.list`; `credential.key.register`,
`.delete`, `.read`, `.list`; `credential.trust.set`, `.delete`, `.read`; `credential.exchange`.
Every one of them is registered in `observability.md`'s vocabulary table with exactly this
extension set (its AC12 names the read, list, update and trust events; re-verified on the Fable
recheck), and an unregistered event is rejected at test time.

**Reads are audited here, and that is the exception the channel's rule names.** `observability.md`
keeps ordinary reads off the audit channel and `management-api.md` follows it; this surface's
reads and listings are the one recorded exception, made because the read itself is the
security-relevant act: an admin listing another principal's credentials is the reconnaissance
step before a revocation or an impersonation, a read of a trust policy shows exactly which CI
identity may become which robot, and a key read is the public half of a signing identity. A
SIEM asking "who looked at whose credentials" is a question the request log, which carries no
`owner`, cannot answer. No line carries a secret, which `auth.md` AC7's leak scan already
polices for every log line and AC4 here re-asserts on the create response.

**No `Operation` record is written.** `management-api.md`'s `Operation` is repository-bound (a
repository ref, a produced snapshot) and this surface touches no repository content; that spec
made the same call for human grants and upstream credentials ("every change is an audit line"),
and the credential row itself, retained after revocation with who and when, is the queryable
history an `Operation` would otherwise be (the resolved audit-shape decision below, was Q5).

### Configuration

Following the vendored `cobra-viper` skill: `internal/credential` receives a typed `Config`
with a default for every key, never imports Viper or Cobra, and every key is settable by flag,
environment variable and configuration file in that skill's precedence order (AC21).
`deployment.md` carries them in its key inventory (the `credentials.` row, eight keys, these
defaults) and documents the first-mint procedure this spec's resolved API-first decision (was
Q7) costs, in "First run and first mint" (its AC26 runs the `curl`); they are named here because
they are this surface's policy:

| Key | Default | Meaning |
|---|---|---|
| `credentials.default_token_lifetime` | `2160h` (90 days) | Lifetime of a token created without `expires_at` |
| `credentials.max_token_lifetime` | `8784h` (366 days) | Longest lifetime a create or rotate may request; GitHub's organisation default |
| `credentials.allow_non_expiring` | `true` | Whether `non_expiring: true` is honoured; `false` makes the opt-in a `lifetime-policy` refusal |
| `credentials.expiry_warning_window` | `336h` (14 days) | How long before expiry a token reads `expiring` |
| `credentials.rotation_max_grace` | `24h` | Longest overlap a rotate may request |
| `credentials.exchange_token_lifetime` | `15m` | Lifetime of a token minted by OIDC exchange; capped at `1h` |
| `credentials.revoked_retention` | `2160h` (90 days) | How long a revoked or expired row stays listed |
| `credentials.last_used_resolution` | `10m` | Minimum interval between `last_used_at` updates for one credential |

A lifetime policy is enforced at creation and rotation only. Changing `max_token_lifetime`
never revokes or blocks an existing token: GitHub's "blocked but not revoked" state is the
worst of both, a token that exists in the listing and fails in use. An operator who wants
existing long-lived tokens gone revokes them, and the `owner` and `expiring` filters make the
candidates findable.

### Package shape

`internal/credential` is one domain package (the `go` skill's flat-by-default rule): the
`Service` with `Create`, `Rotate`, `Revoke`, `List`, `Exchange`, the robot and key operations,
and the HTTP handlers registered under the `api` mount. It depends on `internal/auth` for
minting, hashing and OIDC verification (it defines the small consumer interface it needs from
that package, at the point of use), on the shared metadata store through the entities
`data-model.md` owns ("Principals, credentials and grants"), and on `observability.md`'s
`Auditor` and instruments for the audit line and the gauge. It exposes no interface for others
to implement, beyond satisfying the trust-policy reader `internal/verify` declares for itself
(above); the format handlers never see it (no handler package imports it, AC22), because a
handler that could mint a token could mint authority.

### Mechanical enforcers

Per the constitution, every boundary this spec introduces names the test that holds it:

| Boundary | Enforcer |
|---|---|
| Every route is mounted under the reserved `api` segment and mapped through the central authorizer with its declared requirement (a human principal, or the admin role); no code in `internal/credential` evaluates authorization itself, reads a `Grant` row, or branches on a principal's kind; the owner-bound check at mint and exchange is a call into `internal/auth`'s evaluator | `internal/credential/arch_test.go`, the shape `management-api.md` AC2 and `replication.md` AC18 use, extended with the `Grant`-read assertion |
| No handler package imports `internal/credential`; no code in `internal/credential` imports a hashing, random or JWT primitive directly (it calls `internal/auth`) | `internal/credential/arch_test.go` (import graph), beside `auth.md` AC9's allowed-library test |
| The token value appears in exactly one response and no log line, metric, span attribute, audit record or error body | `internal/credential/display_once_test.go`, scanning every response and everything `telemetry.NewTestRecorder` captured (metrics, spans, logs, audit) across a create, rotate, list, read, replay and refusal |
| Every request past the authorizer emits exactly one audit line, credential-free, in the registered vocabulary, and an authorizer refusal emits none from this package | `internal/credential/audit_test.go` on `telemetry.NewTestRecorder` |
| The exchange makes no outbound request for an issuer no trust policy names | `internal/credential/exchange_test.go` with a recording outbound transport: an identity token naming an unlisted issuer is refused with zero outbound requests |
| The four `auth.md` rules (AC6, AC16, AC29, AC30) hold through this surface | `internal/credential/policy_test.go`, table-driven over each refusal |
| The `last_used_at` worker is bounded and drains on shutdown | `internal/credential/last_used_test.go` under `testing/synctest` |
| `/api/v1/tokens`, `/api/v1/robots` and `/api/v1/keys` are in the OpenAPI document and lose nothing between tags | `management-api.md` AC25's `internal/manage/openapi/openapi_test.go`, which covers every route under `/api/v1` |

## Acceptance Criteria

- [ ] AC1: `POST /api/v1/tokens` by an authenticated human session creates a token owned by that
      principal, answers `201` with the row and a `secret` whose value begins with `swr_`
      followed by the row's `id`, records the session's principal as `created_by`, and the same
      value presented as a Bearer credential and as a Basic password authenticates as that
      principal with the requested scopes on a real `curl` against a hosted generic repository
      (generic's only client, and generic declares no proxied path); and the token every
      format's auth conformance case presents, `auth.md` AC3's `docker login` and AC4's `npm`,
      `pip` and `mvn` among them, is a row this route creates or the seed path provisions in the
      same shape, so no format's client authenticates with a credential this surface could not
      have issued.
- [ ] AC2: `GET /api/v1/tokens` returns a session's own tokens and no other principal's; the
      admin's listing returns every token and honours `owner`, `state` and `expiring` filters;
      `GET`, `POST .../rotate` and `DELETE` on `/api/v1/tokens/{id}` for a token the caller may
      not see answer `not-found` identically in status, body and headers to an unknown `id`;
      two tokens never share an `id`, a forced lookup-prefix collision at mint yielding a
      regenerated prefix and one row; and every listing paginates with `limit`, `cursor` and
      `Link: rel="next"`.
- [ ] AC3: A token's value is form-agnostic: one token created here resolves to the same
      principal and scopes in each presentation form `auth.md` AC31 names, so this surface stores
      nothing form-specific, proven by creating one token and exercising the forms.
- [ ] AC4: The `secret` member appears only in the `201` of the creating or rotating request:
      the listing, the read, every refusal, the audit line, the emitted log and metrics, and an
      `Idempotency-Key` replay of the create carry no token value, asserted by a test that
      captures every response and log line of each and scans them for the value and its hash
      preimage.
- [ ] AC5: A token whose expiry lies within the warning window is listed and read with state
      `expiring` and its `expires_at`, the window being `credentials.expiry_warning_window`, still authenticates on a real client, and is returned by
      `expiring=true`; the same token before the window reads `active`; after expiry it reads
      `expired`, is refused with an authentication error and never as anonymous, and stays
      listed until the retention window passes; the gauge `credentials{state,owner_kind}` moves
      with each transition and reports the same counts as the listing; all on an injected clock.
- [ ] AC6: `DELETE /api/v1/tokens/{id}` by the owner or the admin answers `204`, the token is
      refused on the next request on every path except an already-issued OCI JWT, which fails
      once expired and no later, the row is listed as `revoked` with the revoking principal and
      time for `credentials.revoked_retention` and pruned after it, a second `DELETE` answers `204`, and a
      rotate of a revoked token is refused; the pruning is the `credential.prune` job's, and an
      exchange-minted token's row is pruned at its expiry while a revoked one is retained.
- [ ] AC7: Creating a token with scopes on two repositories is refused `validation` without
      `multi_repository: true` and accepted with it when every repository is named, a pattern
      where a repository name belongs is refused, and the accepted token is the credential with
      which `formats/oci.md` AC1's pinned suite passes its cross-mount cases against
      `OCI_NAMESPACE` and `OCI_CROSSMOUNT_NAMESPACE`.
- [ ] AC8: Creating a token with a scope its owner does not currently hold, pattern included, is
      refused `scope-exceeds-owner` naming the scope, for a human owner and for a robot owner
      whether the admin or the owner requests it; a freshly created robot holds no grants and can
      be issued no token until the admin grants it one through `management-api.md`'s grant
      surface, after which a token within that grant is issued.
- [ ] AC9: A token owned by a robot keeps its full authority after the human who created the
      robot and minted the token has every grant revoked locally (removal at the identity
      provider changes nothing the registry can observe), while a token owned by that human
      loses its matching authority on the next request; a disabled robot's tokens are refused on
      the next request and the exchange mints nothing for it, both restored when the robot is
      re-enabled, their rows untouched; deleting a robot revokes every token it owns, deletes its
      grants and trust policy in the deletion transaction with one `credential.robot.delete`
      audit line and no `manage.grant.delete` line, and its name cannot be reused.
- [ ] AC10: A token created without `expires_at` expires after `default_token_lifetime` (`2160h` by default); a
      lifetime beyond `max_token_lifetime` is refused `lifetime-policy`; `non_expiring: true`
      is honoured with `allow_non_expiring` unset and refused `lifetime-policy` with it set to
      `false`; and lowering `max_token_lifetime` after creation neither revokes nor blocks an
      existing token.
- [ ] AC11: `POST /api/v1/tokens/{id}/rotate` answers `201` with a new token carrying the
      original's name, owner, scopes and multi-repository mark, with an expiry equal to the
      original's lifetime from now unless the request names one, the original's expiry becomes
      now plus `grace` (zero by default; a `grace` beyond `credentials.rotation_max_grace` is
      refused `lifetime-policy`), both values authenticate during the grace and only the new one
      after it, and the listing links the two; after `max_token_lifetime` is lowered below the
      original's lifetime, or `allow_non_expiring` is set `false` under a non-expiring original,
      the same rotate is refused `lifetime-policy` with the original untouched, and a rotate
      naming a lifetime inside the new policy succeeds.
- [ ] AC12: `POST /api/v1/keys` with a PEM RSA public key of at least 2048 bits, a unique name,
      scopes and an expiry creates a registered public key whose fingerprint is returned and
      whose value is never treated as a secret; a key under 2048 bits, a non-RSA key, a duplicate
      name or a name that is not the caller's to change is refused; a real `knife supermarket
      share` signed with the matching private key and naming the key in `X-Ops-Userid` succeeds
      against a hosted repository within the key's scopes and is refused outside them, after
      expiry, and after `DELETE /api/v1/keys/{name}`.
- [ ] AC13: `POST /api/v1/tokens/exchange` with an identity token from a fixture OIDC issuer
      whose claims match exactly one robot's trust policy answers `201` with a token owned by
      that robot, scoped within the robot's grants, expiring within `credentials.exchange_token_lifetime`
      and refused with `non_expiring: true`, and asking for a scope outside the robot's grants is
      refused `scope-exceeds-owner` naming it with nothing minted; an identity token with a bad
      signature, wrong issuer, wrong audience, expired, matching no policy, or matching a
      disabled or deleted robot's policy is refused with an authentication error and never as
      anonymous; an identity token whose `iss` no trust policy names is refused with zero
      outbound requests, on a recording transport; one matching two policies is refused
      `conflict`; every exchange, minted or refused, leaves one `credential.exchange` audit
      line carrying `issuer`, and `problem_type` on a refusal; a `PUT` of a policy identical in
      issuer, audience and constraints to another robot's is refused `conflict`, and a
      `github`-profile policy omitting `repository_owner_id` is refused `validation` at `PUT`;
      and the matched robot's trust
      policy is readable through the consumer interface `internal/verify` declares, with the
      profile row's mapping yielding the certificate identity `artifact-verification.md` AC28
      checks an exchanged token's upload against.
- [ ] AC14: Every route under `/api/v1/tokens`, `/api/v1/robots` and `/api/v1/keys` refuses a
      request authenticated by a token, including a token owned by the admin, with
      `unauthorized`, so no token can mint, list, rotate or revoke a credential.
- [ ] AC15: Every refusal on this surface is RFC 9457 `application/problem+json` with a `type`
      from `management-api.md`'s closed list, `scope-exceeds-owner` and `lifetime-policy` each
      answered `422` as that list records them, and every response carries `X-Request-Id`,
      echoing the caller's when one was sent.
- [ ] AC16: A create, rotate, key registration or robot create repeated by the same principal
      with the same `Idempotency-Key` and payload within `management.operation_retention`
      returns the original row without a second row being created and without the `secret`;
      the same key with a different payload is refused `idempotency-key-reuse`; the same key
      from a different principal is an independent write that creates its own row; and the
      exchange route ignores the header, a repeated exchange minting a second token.
- [ ] AC17: A credential presented over a connection the server did not terminate with TLS,
      including an identity token at the exchange route, is refused as `auth.md` AC27 states
      with the plaintext flag unset, and the create route over TLS then succeeds.
- [ ] AC18: Every request to these routes that passes the shared authorizer, reads and listings
      included, emits exactly one structured audit line through `telemetry.Auditor.Emit`, its
      `event` one of the `credential.*` names registered in `observability.md`'s vocabulary,
      carrying `request_id`, `principal`, `principal_kind`, `credential` (the lookup prefix or
      key name), `owner`, `owner_kind` and `outcome`, with `problem_type` on a refusal,
      `multi_repository` on a create and `issuer` on an exchange, no credential value in any
      attribute; a request the authorizer refuses (a token-bearing request under AC14, a
      credential-less one) leaves the authorizer's `auth.*` record and none from this package,
      so one refused request yields one record in total; and the line for a revocation survives
      the row's pruning.
- [ ] AC19: `last_used_at` on a token used continuously by a real client advances at most once
      per `credentials.last_used_resolution`, no verification performs a synchronous write, and the update
      worker drains on server shutdown with no lost update and no goroutine left running.
- [ ] AC20: A credential scoped to a repository that is then deleted and recreated under the
      same name stays listed with its scope naming the deleted repository by identity and
      rendering its last name from the tombstone, grants nothing on the recreated one, and a
      listing or read of it does not fail, at and after the repository's tombstone time; the
      deletion removed the repository's grants and touched no credential row.
- [ ] AC21: `internal/credential` receives a typed `Config` with a default for every key in the
      configuration table and never imports Viper or Cobra; every key is settable by flag,
      environment variable and configuration file in the cobra-viper precedence order, proven by
      an in-process command test.
- [ ] AC22: No code in `internal/credential` evaluates authorization, imports a hashing, random
      or JWT primitive, or is imported by any handler package under `internal/format`, and every
      route it registers sits under the reserved `api` segment and is mapped through the central
      authorizer, all enforced by an architecture test that fails on a violation.
- [ ] AC23: In the UI, the token list shows each token's state and `expires_at` with an
      `expiring` token visually distinct from an `active` one, creating a token shows the secret
      once and never again after navigation, revoking a token moves it to `revoked` in the list,
      and the admin's robot page creates a robot, disables it and mints a token for it.
- [ ] AC24: The `Principal`, `Credential`, `Grant` and `TrustPolicy` entities are specified in
      `data-model.md`'s entity table and its "Records that are not mark roots" (its "Principals,
      credentials and grants" and AC39, in place since 2026-09-27) with the four fields the
      Fable recheck of 2026-10-01 reported to it (`created_by`, the idempotency triple, the
      lookup-prefix unique index, `deleted_at`, the issuer profile), which is the gate this
      criterion places before any code under `internal/credential` reaches `main`, and a blob
      referenced only through a credential's scoped repository is collected while the credential
      row stays readable.

- [ ] AC25: Every trusted-publishing binding is a pure translation onto `POST
      /api/v1/tokens/exchange`: for the PyPI and Open VSX bindings (`formats/pypi.md` AC19,
      `formats/openvsx.md` AC33), an identity token from the harness's fixture OIDC issuer
      matching one robot's trust policy yields exactly one token row owned by that robot, minted
      by the exchange with its lifetime and scope rules, and returned in the binding's captured
      wire shape; an identity token matching no policy mints no row; no handler package imports
      `internal/credential`, so a binding reaches a token only through the exchange; and the Open VSX binding
      is written only after its wire shape is captured from ovsx 1.2.0, its case not expected to
      pass before.
## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration + conformance | `internal/credential/create_test.go` (row, `created_by`, `swr_` shape); `conformance/generic/token_lifecycle_test.go` (the case's `script` mints through the API with the seeded admin credential, then a real `curl` presents it as Bearer and as Basic against the hosted generic repository; generic declares proxy `unsupported`, so hosted only); `auth.md` AC3's and AC4's conformance cases, whose seeded `credentials` entries are rows of the `Credential` shape this route writes (`conformance-harness.md` AC25, shared) |
| AC2 | integration | `internal/credential/list_test.go` (own versus admin listing, filters, existence oracle on read, rotate and delete, forced prefix collision, pagination) |
| AC3 | integration | `internal/credential/forms_test.go`, driving `auth.md` AC31's `credential_form_test.go` helper with a token minted here |
| AC4 | integration | `internal/credential/display_once_test.go` (every response of create, rotate, list, read, replay, refusal, plus everything `telemetry.NewTestRecorder` captured for each: metrics, spans, log records, audit records; `observability.md`) |
| AC5 | integration + conformance | `internal/credential/expiry_state_test.go` (injected clock through each state); `internal/credential/metrics_test.go` (`credentials{state,owner_kind}` on `telemetry.NewTestRecorder`; shared with `observability.md` AC6); `conformance/generic/expiring_token_test.go` (an `expiring` token, seeded through the harness's `credentials` sub-entry per `conformance-harness.md` AC25, runs a real client) |
| AC6 | integration | `internal/credential/revoke_test.go` (next-request refusal, OCI JWT window via `auth.md` AC5's fixture, retention and the `credential.prune` job on an injected clock with an exchanged token pruned at expiry and a revoked one retained, idempotent delete, rotate refused; the job registered in `internal/async/kinds_test.go`'s table, `async-operations.md`) |
| AC7 | integration + conformance | `internal/credential/multi_repository_test.go`; `formats/oci.md` AC1's suite run in `conformance/oci/`, its `OCI_PASSWORD` a token minted through this route |
| AC8 | integration | `internal/credential/owner_bound_test.go` (human and robot owners; grant-then-mint ordering through `internal/manage`'s grant surface) |
| AC9 | integration | `internal/credential/robot_test.go` (creator's grants revoked; disable and re-enable, the exchange refused while disabled; delete in one transaction with grants and trust policy gone, one audit line on `telemetry.NewTestRecorder`, name reservation) |
| AC10 | integration | `internal/credential/lifetime_policy_test.go` (default, maximum, opt-in with the flag unset and set, policy lowered after creation) |
| AC11 | integration | `internal/credential/rotate_test.go` (identical scopes, expiry arithmetic, explicit lifetime on rotate, grace overlap on an injected clock, grace beyond maximum refused, rotate refused under a policy tightened after creation and accepted with a lifetime inside it, chain visible in the listing) |
| AC12 | integration + conformance | `internal/credential/public_key_test.go` (PEM forms, size, duplicates, ownership); `conformance/chef/signed_publish_test.go` (`knife supermarket share` with a registered key seeded through the harness's `credentials` sub-entry, its private half delivered to the client container as a file per `conformance-harness.md` AC25: in scope, out of scope, expired, revoked; `formats/chef.md` AC11) |
| AC13 | integration | `internal/credential/exchange_test.go` (fixture OIDC issuer in a container under the `generic` profile: match, each tamper, no match, disabled and deleted robot, two matches, scope outside the robot's grants, an unlisted issuer against a recording transport with zero outbound requests, duplicate-policy and missing-`repository_owner_id` refusals at `PUT`, trust policy readable through the `internal/verify` consumer interface); `internal/verify/sigstore/robot_identity_test.go` (exchanged token's upload bound to the same robot; `artifact-verification.md` AC28's test, shared) |
| AC14 | integration | `internal/credential/no_token_admin_test.go` (every route under a token, including the admin's) |
| AC15 | integration | `internal/credential/problem_test.go` (every refusal's type and shape; `X-Request-Id` echo) |
| AC16 | integration | `internal/credential/idempotency_test.go` (create, rotate, key registration and robot create; same principal replay without `secret`; different payload refused; a second principal's identical key independent; the exchange ignoring the header; the window on an injected clock) |
| AC17 | integration | `internal/credential/plaintext_test.go`, reusing `auth.md` AC27's `plaintext_test.go` harness for the create and exchange routes |
| AC18 | integration | `internal/credential/audit_test.go` on `telemetry.NewTestRecorder` (one line per request past the authorizer, reads included; registered `credential.*` event and extension attributes; no value; an authorizer-refused request yielding one `auth.*` record and none from this package; survival across pruning) |
| AC19 | unit | `internal/credential/last_used_test.go` under `testing/synctest` (resolution, no synchronous write, drain on shutdown) |
| AC20 | integration | `internal/credential/deleted_repository_test.go` (scope inert on the recreated repository; grants gone, credential rows untouched); `internal/credential/listing_test.go` (name rendered from the tombstone at and after tombstone time on the injected clock; shared with `repository-lifecycle.md` AC24) |
| AC21 | unit | `internal/credential/config_test.go` (in-process command test in the cobra-viper skill's shape) |
| AC22 | architecture test | `internal/credential/arch_test.go` |
| AC23 | e2e | `web/e2e/credentials.spec.ts` (Playwright: list states, display-once, revoke, robot page); lands with the UI at charter step 9 |
| AC24 | review + integration | `data-model.md` "Principals, credentials and grants" and AC39 (present since 2026-09-27; re-checked at this spec's gate review); `internal/model/credential_records_test.go` (`data-model.md` AC39); `internal/storage/gc_property_test.go`, the file `data-model.md` AC34's row names, with the four entities among the non-root records whose blobs are collected |
| AC25 | integration + conformance + architecture | `internal/credential/exchange_binding_test.go` (a fixture binding translating into the exchange: one row per matching identity token, none for no match, the row's owner, lifetime and scopes as AC13's); `internal/credential/arch_test.go` (the existing import-graph rule that no handler package imports `internal/credential`, with a fixture binding package that does failing); `conformance/pypi/trusted_publishing_test.go` and `conformance/openvsx/trusted_publishing_test.go` (shared with `formats/pypi.md` AC19 and `formats/openvsx.md` AC33; the fixture issuer through `conformance-harness.md` AC25's `trust_policy` sub-entry) |

## Implementation Phases

### Phase 1: Tokens and robots (charter step 2, with generic and the management surface core)
- The `Principal`, `Credential` and `Grant` entities as `data-model.md` specifies them
  ("Principals, credentials and grants", AC39; AC24 here)
- `internal/credential`: `Config` (AC21), the `Service`, `POST`, `GET`, `DELETE` and `rotate`
  under `/api/v1/tokens` (AC1, AC2, AC4, AC6, AC11), the four `auth.md` rules through the
  surface (AC7, AC8, AC10), expiry states (AC5), problem types and idempotency (AC15, AC16)
- Robots under `/api/v1/robots` (AC9), token-bearing requests refused (AC14)
- Audit lines (AC18), `last_used_at` worker (AC19), the `credential.prune` job (AC6), plaintext
  refusal on the routes (AC17), deleted-repository tolerance (AC20), the architecture test
  (AC22), form-agnostic proof (AC3)
- This phase is what `formats/oci.md` Phase 1 waits on

### Phase 2: Registered public keys (before `formats/chef.md` Phase 1's private reads)
- `/api/v1/keys` and the `public-key` credential kind (AC12); `auth.md`'s verifier grows the
  signed-request form in the same pass (its AC34, in place since the reconciliation)

### Phase 3: OIDC exchange (after OCI; before the first trusted-publishing binding)
- `TrustPolicy`, `PUT /api/v1/robots/{name}/trust`, `POST /api/v1/tokens/exchange` (AC13)
- The binding rule and its architecture test (AC25); the PyPI and Open VSX bindings themselves
  land with their formats, the Open VSX one after its ovsx 1.2.0 capture

### Phase 4: The UI (charter step 9)
- Token list, creation, revocation and robot administration in the web UI (AC23)

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None remain open. Q1 through Q7 were raised while authoring, because the citing specs'
requirements met at seven points where two readings were possible, and each was adopted on
2026-09-27 under the owner's standing delegation at its own written recommendation. The
resolved records are kept so the reasoning survives.

### Resolved: what the robot account is (was Q1)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a robot is a principal
kind with no login, holding grants in `auth.md`'s vocabulary and owning ordinary tokens, so it
changes no evaluation rule. Folded through Design ("What a credential is", "Robot accounts"),
AC8, AC9 and Phase 1.

The judgment call it settles: `auth.md`'s resolved token-authority decision (was Q20) left CI
tokens dying with their owner and named this spec as where a robot would arrive, while its
resolved two-repository decision (was Q22) rejected, as option C, "a robot-account principal
whose secret authorizes its grants" because it was "still a single secret spanning
repositories".

**Recommendation (adopted):** A, because it answers Q20's cost with a principal and not with a
new credential, so every `auth.md` rule applies to it unchanged.

| Option | You get | It costs |
|---|---|---|
| **A. A principal kind that owns ordinary tokens** | No new credential kind, no new evaluation rule; a robot can hold several tokens, each scoped and revocable alone; Q22's objection to option C does not arise | A robot needs grants before it can be issued anything, so onboarding is two steps; someone must administer it (Q2) |
| **B. Harbor's shape: the robot's secret is its credential** | One object to create | Q22 rejected exactly this: one secret spanning the robot's whole authority, and a rotation that is a full re-provisioning |
| **C. No robot; CI tokens are owned by a designated long-lived human account** | Nothing to build | The shared human account is the anti-pattern SSO exists to remove, and `auth.md` disables the only local account once OIDC is configured |

Accepted cost: a two-step onboarding and admin-only administration. B lost on `auth.md`'s own
record; C lost because it recreates the shared password.

**Why this is yours:** it adds a principal kind to the security foundation and decides what a
"service account" means on this platform.

Rechecked on Fable 2026-10-01: confirmed. The options are fairly framed and B is refuted by
`auth.md`'s own was-Q22 record as claimed. Under-stated: the robot as a principal is what makes
the OIDC exchange a pure translation (an exchanged token is owned by the robot and evaluated by
AC30 unchanged), so option A is also what keeps the trusted-publishing bindings free of any
authorization logic; and the fold left the robot's name grammar unstated, now
`repository-lifecycle.md`'s (Design, "Robot accounts").

### Resolved: who administers a robot and its tokens (was Q2)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: in v1 the global admin
alone creates, disables and deletes robots and mints, rotates and revokes their tokens; a
per-robot manager right is raised as a change to `auth.md`'s vocabulary, never stretched out of
`admin`. Folded through Scope (out of scope), Design ("The token surface", "Robot accounts"),
AC8, AC9 and AC14.

The judgment call it settles: a CI token must be rotated by somebody, and the person who set
the pipeline up is the natural somebody, but `auth.md`'s vocabulary has no "may manage this
robot" action and its Scope names delegated grant administration out of scope.

**Recommendation (adopted):** A, because the alternative introduces a fourth action into a
vocabulary another spec owns, in the wrong spec.

| Option | You get | It costs |
|---|---|---|
| **A. Admin only in v1** | Consistent with `auth.md`'s admin-only grant administration; no vocabulary change | Every robot token rotation is an administrator's task, which centralises toil on small teams |
| **B. A `manage` action on robots, granted per robot** | Teams rotate their own CI tokens | A fourth action in `auth.md`'s vocabulary, landing in human grants and token scopes at once, decided here rather than there |
| **C. The robot's creator administers it** | No new action | Recreates the departing-owner problem one level up: the creator leaves and the robot is orphaned |

Accepted cost: administrator toil, named in Scope. B lost because it is `auth.md`'s change to
make; C lost because it moves the problem rather than solving it.

**Why this is yours:** it decides how much administration the smallest deployment can delegate.

Rechecked on Fable 2026-10-01: confirmed. The cost is stated honestly but its mitigation was
not: a robot whose CI runs under an OIDC issuer needs no rotation at all, since the exchange
mints a fresh fifteen-minute token per job, so the administrator's toil is confined to robots
on CI without an identity token. The fold under-stated how "admin only" reaches the authorizer;
Design ("How who reaches the authorizer") now states the human-principal requirement every
route declares, reported to `auth.md` as a requirement shape its vocabulary must carry.

### Resolved: rotation semantics (was Q3)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: rotation mints a
replacement with identical scopes and shortens the original's expiry to now plus a bounded
`grace`, zero by default. Folded through Design ("Rotation"), AC11 and the configuration table.

The judgment call it settles: GitLab inactivates the rotated-out token immediately, JFrog's
refreshable tokens allow a 24-hour grace, and a CI system whose secret store propagates in
minutes needs the second while a leaked token needs the first.

**Recommendation (adopted):** A, because it expresses overlap with a mechanism that already
exists, expiry, and defaults to the safe reading.

| Option | You get | It costs |
|---|---|---|
| **A. Replacement plus an early expiry on the original, grace zero by default** | Overlap when asked for, bounded by the operator; no new state; the old token is visibly `expiring` | A rotation is two rows, and a user who forgets `grace` breaks their own pipeline for the seconds it takes to update the secret |
| **B. Immediate inactivation only** | Simplest; GitLab's behaviour | Every rotation is a brief outage for slow secret stores, which pushes people to non-expiring tokens |
| **C. Refresh tokens** | The client refreshes itself | A second long-lived secret outside hash-only storage, the shape `formats/oci.md` derived out for the token endpoint |

Accepted cost: two rows per rotation. B lost because it makes rotation painful, and painful
rotation is how tokens become non-expiring; C lost on `auth.md`'s storage rule.

**Why this is yours:** it decides how a leaked token's replacement behaves during the minutes
that matter.

Rechecked on Fable 2026-10-01: amended. The adoption stands; its fold contradicted the
configuration section, which says a lifetime policy is enforced at rotation, while "Rotation"
copied the original's lifetime unconditionally, so a rotate under a tightened
`max_token_lifetime` or a disabled non-expiring opt-in had no defined outcome. Design
("Rotation") and AC11 now apply the policy as it stands at rotation, refuse `lifetime-policy`
when the inherited default falls outside it, and let the request name a lifetime inside it,
which is also the procedure that retires old long-lived tokens without revoking them.

### Resolved: what an `Idempotency-Key` replay of a create returns (was Q4)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the replay returns the
original row without the `secret`; a client that lost the response revokes and recreates.
Folded through Design ("Display once"), AC4 and AC16.

The judgment call it settles: `management-api.md`'s convention is that a replay "returns the
original response", and the one case where a client most needs that, a lost `201` carrying a
secret it will never see again, is the one case `auth.md` AC6 makes impossible, since the
server holds no secret to return.

**Recommendation (adopted):** A, because the alternative stores a recoverable secret, which
`auth.md` forbids by name.

| Option | You get | It costs |
|---|---|---|
| **A. Replay without the secret** | AC6 holds; the replay still prevents a duplicate mint | A lost response costs a revoke and a recreate |
| **B. Hold the secret encrypted for the idempotency window** | A lost response is recoverable | A recoverable secret in the database for up to 90 days, the exact thing "Tokens are never stored recoverable" forbids |
| **C. No idempotency on create** | Nothing to decide | A retried create mints two tokens, one of them unknown to its owner |

Accepted cost: the revoke-and-recreate procedure. B lost on `auth.md`'s rule; C lost because it
manufactures orphan credentials.

**Why this is yours:** it weighs recoverability against the storage rule you approved.

Rechecked on Fable 2026-10-01: amended. The adoption stands; its fold was incomplete on two
points. `management-api.md` keeps the key on the `Operation` record and the audit-shape
decision (was Q5) writes none here, so the key had nowhere to live; Design ("Where the
`Idempotency-Key` lives") now stores it on the row the write created, matched on the
requesting principal and the key so no principal can replay another's row, within
`management.operation_retention`. And the exchange route, which the fold silently included,
accepts no key: a replay without the secret serves nothing a CI job could use. AC16 asserts
both; `data-model.md` is reported the fields.

### Resolved: whether credential events leave an `Operation` record (was Q5)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: an audit line for every
request and a retained credential row for every revocation; no `Operation` record. Folded
through Design ("Audit", "Revocation"), AC6 and AC18.

The judgment call it settles: `management-api.md` item 14 asks this spec to follow its
"Operation/audit conventions", and that spec's AC23 records an `Operation` for every completed
operation, but its `Operation` is repository-bound and snapshot-producing, and it made no
`Operation` for human grants or upstream credentials, only an audit line.

**Recommendation (adopted):** A, because it follows the precedent that spec set for its own
non-content operations, and the retained row already is the queryable history.

| Option | You get | It costs |
|---|---|---|
| **A. Audit line plus retained row** | Consistent with grants and upstream credentials; no repository-less `Operation`; revocations queryable through the listing | Credential history and content history are queried on different routes |
| **B. An `Operation` per credential event** | One history route for everything | An `Operation` with no repository, no snapshot and no handler, which bends `data-model.md`'s entity to fit |

Accepted cost: two history routes. B lost because it bends a repository-bound entity.

**Why this is yours:** it decides what "the audit trail" means for security events versus
content events.

Rechecked on Fable 2026-10-01: amended. The shape stands, and `management-api.md`'s Fable
recheck of 2026-09-30 confirmed it from its side. Three things in the fold were wrong or
missing. "Every request, refused or not" would have emitted a second line for a write the
shared authorizer had already refused and audited, against the amended channel rule; the
Audit section and AC18 now emit one line per request past the authorizer and none for an
authorizer refusal. The Audit section still described the robot, key and trust events as
"additions this pass reports" to `observability.md`, which registered them on 2026-09-28 (its
AC12); now cited as registered, re-verified. And the read exception the channel rule names for
this surface had no stated reason; it now has one (the read is the security-relevant act, and
the request log carries no `owner`). The pruning the record relied on had no mechanism; it is
the `credential.prune` job, and an exchange-minted token is pruned at expiry rather than
retained, since retention exists for the revoked-before-expiry case and not for thousands of
fifteen-minute rows.

### Resolved: which credential concerns are this spec's and which are `auth.md`'s (was Q6)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: this spec owns stored,
owned credentials (tokens and registered public keys) and their lifecycle; `auth.md` owns every
presentation form, its redaction and its plaintext refusal, and every ephemeral thing its token
service mints (the OCI JWT, Terraform's download capability). Folded through Scope (both lists),
Context and AC3.

The judgment call it settles: the format-side reconciliation's cross-cutting theme 8 lists new
presentation forms (conda's and luarocks's path segments, four vendor headers, Chef's signed
requests, Terraform's capability) and asks what of them this spec issues and lists versus what
stays `auth.md`'s.

**Recommendation (adopted):** A, because the boundary "stored and owned" is checkable (does a
row exist, can a person list and revoke it) while "minted by us" is not (the OCI JWT is minted
by us and nobody manages it).

| Option | You get | It costs |
|---|---|---|
| **A. Stored and owned here; presented, verified and ephemeral there** | Each new form is one verifier change with its redaction, inside `auth.md` AC10's review scope; this spec never grows a per-format branch | Terraform's capability is a credential nobody can list or revoke, accepted by that spec as the JWT's window |
| **B. This spec owns every credential form, including the ephemeral ones** | One place for the word "credential" | Two specs verifying credentials, and a listing of minute-lived capabilities nobody wants |
| **C. Per-format specs own their own forms** | Nothing shared | The account-takeover surface of a credential path scattered over 33 specs, which `auth.md` centralised for a reason |

Accepted cost: the unmanaged capability. B lost because it splits the verifier; C lost because
it decentralises the security boundary.

**Why this is yours:** it draws the line between the mechanism spec you gated on external
review and the product spec.

Rechecked on Fable 2026-10-01: confirmed. `auth.md`, planned on Fable 2026-09-30, carries the
boundary exactly as this record states it: its Scope names the stored side as this spec's, its
presentation-form table holds every form with its redaction and plaintext refusal, its was-Q24
as amended fixes where a route-scoped form is recognised, and its was-Q25 keeps even the one
credential-echoing response in the shared layer. Nothing here depends on any of those; this
spec stores and lists, the verifier presents and checks, and the line held under a day of
pressure from thirty-three client tables.

### Resolved: API only, or API with a CLI, in v1 (was Q7)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: API first with an
OpenAPI document and no CLI in v1, matching `management-api.md`'s resolved API-first decision
(was Q9). Folded through Scope (out of scope), Design ("Package shape") and AC15.

The judgment call it settles: the foundation queue's hint names "the UI and CLI surfaces that
call it", and `management-api.md` decided against a CLI for its own surface the day before.

**Recommendation (adopted):** A, because two management surfaces with different client
policies would be a product inconsistency, and a CLI is a client of the API that can be added
without changing it.

| Option | You get | It costs |
|---|---|---|
| **A. API and OpenAPI only; CLI later as a client** | Consistent with `management-api.md`; the contract is the document | The first token is a `curl` against a session cookie or the local admin credential, which `deployment.md` shows in "First run and first mint" (its AC26 runs it) |
| **B. A `stackweaver-registry token` subcommand set in v1** | A friendlier first mint | A second client of the API to keep in step, in the binary that is also the server, before the API has a second consumer |

Accepted cost: the `curl` first mint. B lost because it diverges from a same-week decision.

**Why this is yours:** it decides the first-run experience of the product.

Rechecked on Fable 2026-10-01: confirmed. `management-api.md`'s was-Q9 was confirmed on Fable
the day before for the same reason (surface discipline, not effort, which the constitution
forbids as a reason). The cost is stated honestly, with one precision the recheck adds: the
first mint's credential is the local admin credential presented as the Basic password, which
`deployment.md`'s "First run and first mint" and its AC26 run, while `management-api.md`'s
authentication paragraph admits only the bearer token and the session cookie on `/api/v1` and
`auth.md`'s Basic row reads its password as a registry token. That seam is theirs to close and
is reported to both; nothing here changes if they close it by naming the form.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | 69c8159 | authoring pass: grounded first draft, not a review | Not a review. Gathered the requirements `auth.md` (resolved Q15, Q20, Q21, Q22; AC6, AC16, AC29, AC30; "Token expiry"), `formats/oci.md` (resolved Q3, AC1, Phase 1), `management-api.md` (the `api` reservation, wire conventions, audit, the grant and upstream-credential exclusions), `formats/chef.md` (resolved Q1 and Q2), `formats/terraform.md`, `formats/conda.md`, `formats/luarocks.md`, `formats/pypi.md`, `formats/openvsx.md`, `conformance-harness.md` (the `credentials` key and the seed path) and `project-charter.md` step 2 placed on this surface, plus consequences items 4, 5 and 14 and Open items 14, 18 and 24 with cross-cutting theme 8. Grounded prior art this run against Harbor, GitHub, GitLab, JFrog, Sonatype Nexus, npm, Docker Hub, PyPI trusted publishing, Zitadel and Gitea; Pulp not reached. Verified against the tree: no `internal/` exists, `data-model.md`'s entity table carries no principal, credential or grant entity (reported as a sibling consequence, AC24), and the OCI suite's `OCI_NAMESPACE` / `OCI_CROSSMOUNT_NAMESPACE` variables at v1.1.1. Raised and adopted Q1 to Q7 under the standing delegation. 24 criteria, each with a Test Plan row. Stays draft pending a gate review. |
| 2026-09-28 | 0b79dc8 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying. From the data-model reconciliation: the "entity table has none of these three" claim replaced by a citation of "Principals, credentials and grants" and AC39, AC24's gate recorded as met, its Test Plan row naming `internal/model/credential_records_test.go`. From the management-api reconciliation: `scope-exceeds-owner` and `lifetime-policy` recorded as `422` (Design, AC15) and the Context bullet updated to the applied mount, endpoint-table and OpenAPI coverage. From the observability authoring: the audit line goes through `telemetry.Auditor.Emit` in the `credential.<object>.<action>` vocabulary with the registered extension attributes (`credential`, `owner`, `owner_kind`, `multi_repository`, `issuer`), AC4 and AC18 scan through `telemetry.NewTestRecorder`, and the gauge `credentials{state,owner_kind}` (leader-exported, `CredentialsExpiring`) is asserted by AC5 with `internal/credential/metrics_test.go`; the robot `.update`, `.read`, `.list`, key `.read`, `.list` and `credential.trust.*` events are reported back to `observability.md` as vocabulary additions. From the conformance-harness reconciliation: AC5's `expiring` token and AC12's registered key are seeded through `credentials` sub-entries (harness AC25). From the repository-lifecycle authoring: AC20 now states the tombstone-rendered name and that deletion removes grants and touches no credential, with `internal/credential/listing_test.go` shared with lifecycle AC24. From the artifact-verification authoring: the trust policy as an identity source, exchange and attestation bound to one robot (its AC28), the issuer-specific mapping beside the trusted-issuer table; AC13 extended and `internal/verify/identity_test.go` shared. From the deployment authoring: the configuration table and the was-Q7 cost cite the `credentials.` inventory row and "First run and first mint". Stale quotations of `auth.md` ("owed and not yet written", "defines no robot-account principal") rewritten as history with the current citations; Phase 2 cites `auth.md` AC34. No question raised or adopted; `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
| 2026-09-28 | 3135d95 | closing reconciliation sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file from "From format batch 3 reconciliation" through the latest section, plus earlier items the progress log did not show applied, verified against the current text of `openvsx.md` ("Trusted publishing is a binding onto the OIDC exchange", its resolved trusted-publishing decision was Q19, AC33) and `pypi.md` (its binding section and AC19). Applied: format batch 6 item 11 (a binding table under "OIDC exchange" naming Open VSX's `api/-/trusted-publishing/token` with its wire shape recorded as not yet captured, a local capture of ovsx 1.2.0 owed before the binding is written, and nothing assumed about it); format batch 1 item 8 (PyPI's binding cited as the first, its AC19); the Context line on both formats updated from 'declined' to 'binds'; new AC25 (every binding a pure translation onto the exchange, no handler importing `internal/credential`) with a Test Plan row shared with the two formats' trusted-publishing cases and `conformance-harness.md` AC25's new `trust_policy` sub-entry; Phase 3. Found already done: management-api reconciliation 7, conformance-harness reconciliation 7, artifact-verification authoring item 12. No question raised; `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
| 2026-10-01 | b74dd00 | Fable recheck: full review (claim verification at HEAD of every sibling citation: `auth.md` Scope, "Presentation forms", "Where a route-scoped form is recognised", the machine-surface paragraph, "Token expiry", "Tokens are never stored recoverable", AC5 to AC7, AC12, AC16, AC17, AC25, AC27, AC29 to AC31, AC34 and its resolved Q14 to Q17, Q20 to Q22, Q24; `management-api.md`'s mount conventions, closed problem table, endpoint table row, "Audit", "Configuration and the CLI stance", AC17, AC18, AC23, AC25, AC30 and its resolved Q5 and Q9; `observability.md`'s audit channel, vocabulary table, `credentials` gauge, AC6, AC7, AC12, AC19; `data-model.md` "Principals, credentials and grants", AC34, AC39; `conformance-harness.md` `credentials` row and AC25; `repository-lifecycle.md` deletion and tombstone; `artifact-verification.md` was-Q10 and AC28; `deployment.md`'s `credentials.` row and "First run and first mint"; `project-charter.md` steps 2, 6, 9, 11; `web-ui.md` AC12; `formats/oci.md`, `chef.md`, `pypi.md`, `openvsx.md`, `pub.md`, `julia.md`, `rubygems.md`, `generic.md`; the tree still holds only the stub `main.go`) + adversarial lens at full strength on the cloud-authored whole + constitution + re-examination of the seven adoptions made without Fable | Brought current first: every queued consequence naming this file was already applied (the 2026-09-28 sweeps), and the three Fable rechecks of 2026-09-30 that this spec depends on were read for what they changed: `auth.md`'s Q22 recheck (the per-host clients as the second need behind the multi-repository opt-in, now in Context), its Q24 as amended (recognition scope stays the verifier's; nothing here changes), and `management-api.md`'s Q5 as amended (every write past the authorizer under a registered event, reads on the request log, this spec's read events the named exception), which this spec's Audit section and AC18 had contradicted with "every request, refused or not". Verdicts: Q1 confirmed (under-stated: the robot as a principal is what keeps the trusted-publishing bindings free of authorization logic; the name grammar is `repository-lifecycle.md`'s); Q2 confirmed (the OIDC exchange removes rotation toil for robots on an identity-token issuer; the human-principal route requirement stated and reported to `auth.md`); Q3 amended (policy as it stands at rotation; explicit lifetime on rotate; AC11); Q4 amended (the key stored on the created row, matched on the requesting principal, within `management.operation_retention`; none on the exchange; AC16); Q5 amended (no second line for an authorizer refusal; the read exception given its reason; the robot, key and trust events re-verified as registered in `observability.md` AC12 and the stale "reports to it" wording replaced; pruning by a `credential.prune` job with exchange-minted tokens pruned at expiry; AC6, AC18); Q6 confirmed against `auth.md` as planned; Q7 confirmed (the first mint's form named and its seam reported). None superseded; AC10 of `auth.md` untouched and cited as covering the exchange, trust and key routes. Adversarial findings fixed: AC1 ran `docker login`, `npm whoami` and `pip download` against a generic repository "hosted and proxied alike", which no client does and generic cannot (proxy `unsupported`); rewritten onto `curl` hosted-only with the format clients' auth cases sharing the row shape. The "who" column had no path to the authorizer that AC22 permits; Design now declares the human-principal requirement per route, keeps ownership as data scoping under the existence oracle (`not-found` on a non-owner's read, rotate and revoke, AC2), and makes the owner-bound check a call into `internal/auth`'s evaluator, held by the arch test's new `Grant`-read assertion. The exchange fetched any issuer's keys the `iss` claim named, an unauthenticated fetch-any-URL primitive; it now proceeds only for an issuer a trust policy names, with zero outbound requests otherwise, on a recording transport (AC13, enforcer row). The exchange silently narrowed requested scopes where a create refuses; now `scope-exceeds-owner`. A disabled or deleted robot could still be exchanged into; refused. The trusted-issuer table was a code table keyed by issuer, which made the harness's fixture issuer inexpressible; split into an issuer URL (data) and a profile (`github`, `gitlab`, `generic`; code), a `generic` robot deriving no certificate identity. The lookup prefix is the route `id` yet nothing made it unique; a unique index and regeneration on collision (AC2). Robot deletion "through the grant path" would have emitted `manage.grant.delete` lines inside one request; now one transaction, one line (AC9). One policy per robot stated. AC24's row cited a non-existent `internal/model/gc_roots_test.go`; corrected to `data-model.md` AC34's `internal/storage/gc_property_test.go`, and AC24's gate now names the four reported fields. `created_by` recorded on every created row. Both-paths check: the token has no hosted or proxied distinction (one verifier), and the one conformance case here is generic's hosted `curl`; the proxied half of every token's life is each format's auth case, cited. Constitution: findings in the doc, no handler owns a table, the shared data model cited, every boundary named with its enforcer, scope never cut for effort. 25 criteria, each mapped; zero open questions; `node scripts/check-spec.js` zero failures for this file, its only advisories the two an uncommitted review produces; `fable_recheck` cleared; draft to planned. Reported, not applied (five sibling consequences, numbered in the recheck report): `data-model.md` (fields and index), `auth.md` (the human-principal requirement shape on AC10's surface; the local admin credential as the Basic password on `/api/v1`), `management-api.md` (its authentication paragraph and AC30 versus the credential routes' `unauthorized` and the first-mint Basic form), `async-operations.md` (the `credential.prune` kind), `artifact-verification.md` (an `identity-policy` entry referencing a `generic`-profile robot refused at the trust-set write). |
