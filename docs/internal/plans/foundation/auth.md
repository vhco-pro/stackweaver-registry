---
status: draft
status_description: "All nine review questions answered 2026-09-23 and folded through Design, the ACs and the Test Plan. Zero open questions; awaiting a gate review. AC10 still requires external review of the implementation regardless of spec status."
description: "Spec for the two auth surfaces a registry needs: human identity via a standard OIDC client with a local-admin fallback, and machine identity via scoped registry tokens that package clients can actually present."
author: michielvha
goal: "Give every format one auth model that real package clients can use, while keeping user passwords, MFA, account recovery and federation outside our code."
priority: "critical"
issue: 13
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
`npm`, `pip`, `mvn` or `ansible-galaxy`. They present:

| Client | What it sends |
|---|---|
| `docker` / `podman` | The OCI token flow: a `WWW-Authenticate` challenge, then a bearer token from a token endpoint, scoped per repository and action |
| `npm` | `Authorization: Bearer <token>` from `.npmrc` |
| `pip` / `twine` | HTTP Basic, conventionally username `__token__` with the token as password |
| `mvn` | HTTP Basic from `settings.xml` |
| `helm`, `ansible-galaxy` | Bearer or Basic depending on the endpoint |

No identity provider solves this, Zitadel included. It is not an IdP shortcoming: it is a
protocol requirement of 33 separate client tools. **Registry tokens must be issued and verified
by us regardless of which IdP handles humans.**

Per the constitution, the client is the specification and this table is working knowledge, not
ground truth: each row must be confirmed against captured traffic from the real client before
that format's auth conformance cases are written. The `helm` and `ansible-galaxy` rows are the
least certain, since both ecosystems have changed header conventions across versions.

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
- **Machine identity**: scoped, revocable registry tokens that the clients above can present.
- **The OCI token service**: the `WWW-Authenticate` challenge, the token endpoint, and
  short-lived scoped bearer tokens per the distribution spec.
- **Authorization**: permissions evaluated centrally, never in a handler. Repository-scoped is
  the base unit, with **path and tag patterns** layered on it, brought into scope 2026-09-23 so a
  CI credential can be scoped to `prod/*` or to one tag rather than a whole repository.

  This one carries a correctness cost as well as a scope one, and it is not waived by the
  scope decision: every pattern rule is another way to grant more than intended. Pattern
  matching must therefore be deny-by-default, have no implicit wildcards, and be covered by
  conformance cases asserting that a narrowly scoped token is refused outside its pattern.

**Out of scope**

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
  beyond that prefix: no embedded claims, no identifiers, nothing parseable.
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
lookup, a scope model, and HMAC-signed scoped capability tokens, with fuzz targets over prefix
handling and key verification (`backend/internal/services/apikey/` in that repo, verified
2026-09-23). This is a port of exercised code, not a greenfield design - with one deliberate
change: the hash function becomes SHA-256, because bcrypt's cost profile does not survive a
registry request path.

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
bindings are relying-party code and belong to this spec's surface. The session the registry
then issues uses the standard cookie protections (HttpOnly, Secure, SameSite) plus CSRF defense
on state-changing UI routes.

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

**Machine**: a token presented as Bearer or as Basic, depending on what the client sends.
Verification resolves the token to a principal plus its scopes. The Basic-auth path exists
because pip and Maven have no alternative, not because it is preferred. In the Basic form the
password field carries the token and the username is not an authentication input, matching the
pip `__token__` convention. A scope binds to the repository's identity, never its name: a
deleted and recreated repository of the same name is a new repository, and tokens scoped to
the old one grant nothing on it - name-bound scopes are how stale grants silently reattach.

**TLS is required on every credential-bearing path** - Bearer, Basic, and the OCI token
endpoint - since Basic is plaintext without it. Whether the server terminates TLS itself or
sits behind a terminating proxy is a deployment choice; accepting credentials over plaintext
HTTP outside development is a misconfiguration the deployment documentation must name.

**OCI specifically** gets a third path because the distribution spec mandates it: an
unauthenticated request receives a `WWW-Authenticate` challenge naming a realm and scope, the
client exchanges its credential at the token endpoint, and receives a short-lived JWT carrying
the granted scope. That flow is spec-defined, so the official conformance suite exercises it.

The token service is where an implementer is most tempted to invent, so its obligations are
stated: the JWT's signing algorithm is fixed by configuration and **never read from the token's
own header** (algorithm-confusion is the classic JWT break); verification checks signature,
expiry, issuer and audience, and grants exactly the scopes issued, nothing wider; expiry is
short enough to be measured in minutes, because that lifetime is also the revocation window; and the signing key is dedicated to this service and rotatable without failing in-flight
pulls (`kid` selection is the standard mechanism). **The token lifetime is the revocation
window, accepted deliberately**: revocation is not checked per JWT use, because a database
lookup on every layer pull deletes the reason the self-contained token flow exists. Minutes-scale
expiry bounds the exposure, and AC5 names the window rather than promising it away. The concrete claim set, the key's provenance
and its storage are implementation decisions AC10's external review must cover explicitly.

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
step, deliberately.

### Token expiry

Registry tokens **expire by default**, with a non-expiring token available only by deliberate
opt-in - the same shape as the anonymous-access decision, where the risky state requires someone
to choose it.

Accepted cost: a CI token that silently expires breaks a pipeline at an inconvenient moment.
Expiry warnings must therefore be visible well before the event, not delivered as a 401.

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

### Authorization is central, never per-handler

Per `CLAUDE.md`, auth is a shared concern and handlers must not implement it. Because handlers
receive raw `*http.Request`, the compiler cannot hold this boundary, so it is held mechanically:
every format's conformance case set must include unauthenticated and unauthorized cases, runner
enforced (`format-handler-interface.md` AC7).

**How the shared layer learns what it is authorizing:** each handler declares a route-to-scope
mapping, from its own routes to a `(repository, action)` pair, and the shared layer evaluates
that mapping and enforces the result. Format knowledge stays in the format - including OCI's
slash-bearing repository names under `/v2/`, which would otherwise put per-format URL grammar
into security-critical shared code.

The accepted cost is that a handler declaring its mapping wrongly under-protects itself. That is
exactly what AC7's unauthenticated and unauthorized cases catch, which is why they are
runner-enforced rather than advisory.

### Scope vocabulary

A scope is `(repository, action)` where action is one of **`pull`, `push`, `delete`** - OCI's own
vocabulary, used for every format. The scope unit was chosen because it needs no translation from
OCI's grammar, and inventing a second vocabulary would reintroduce exactly that translation layer
at the token-service boundary.

Accepted cost: the words read as container-flavoured to a Maven or PyPI user, and `pull` is an
odd verb for a package download. That is a documentation problem rather than a security one.

### Tokens are never stored recoverable

Only a SHA-256 hash plus a lookup prefix is persisted. A token is displayed once at creation and is unrecoverable
afterwards. This is deliberately inconvenient.

## Acceptance Criteria

- [ ] AC1: A user authenticates through any compliant OIDC provider, demonstrated against at
      least two different providers, with no provider-specific code on the path.
- [ ] AC2: With no OIDC configured, the local admin account authenticates and the server is
      fully usable; the account cannot be used once OIDC is configured unless explicitly kept.
- [ ] AC3: `docker login` succeeds against the OCI token flow, and a token scoped to one
      repository **cannot** read another, asserted by a conformance case that expects denial.
- [ ] AC4: `npm`, `pip` and `mvn` each authenticate using the credential form that client
      natively sends, proven by conformance cases running the real clients.
- [ ] AC5: A revoked credential is rejected on the next request on every path except an
      already-issued OCI token, which remains valid until its expiry. That window is bounded by
      the configured token lifetime, is measured in minutes, and is asserted by a test that
      revokes a credential and shows the OCI token failing once expired and no later.
- [ ] AC6: Tokens are stored only as a SHA-256 hash plus a lookup prefix, compared in constant
      time; a database dump yields no usable credential, asserted by a test that reads the row
      and fails to authenticate with it.
- [ ] AC7: A token or password never appears in logs, error responses or metrics, asserted by an
      integration test that exercises a real failed authentication and scans the emitted output.
      The single exception is the first-start local admin credential (AC15), emitted once by
      design; the test asserts that exactly one such emission occurs and that nothing else leaks.
- [ ] AC8: Every format's conformance case set contains an unauthenticated and an unauthorized
      case, runner-enforced, and a format missing either fails the suite.
- [ ] AC9: No package under `internal/auth/**` implements a cryptographic primitive; verified by
      an architecture test asserting the allowed library set.
- [ ] AC13: Configuring OIDC without naming at least one admin identity is rejected, and after
      a successful OIDC configuration that named identity can administer the registry while the
      local admin no longer authenticates.
- [ ] AC14: A brand-new identity from the provider authenticates successfully and can perform no
      action on any repository until explicitly granted.
- [ ] AC15: The local admin credential is generated from `crypto/rand` at first start, appears in
      the log exactly once, and is stored only as a hash; a second start does not re-emit it.
- [ ] AC16: A token created without an explicit non-expiring opt-in has an expiry, and is
      rejected after it passes; a non-expiring token requires the deliberate flag.
- [ ] AC17: A request for a private repository from a caller without read access is
      indistinguishable from a request for a repository that does not exist, including status
      code, body and timing-insensitive headers.
- [ ] AC18: A handler's declared route-to-scope mapping is what the shared layer enforces; a
      handler whose mapping omits a route fails its unauthenticated and unauthorized conformance
      cases.
- [ ] AC19: A token scoped to a path or tag pattern is accepted inside the pattern and refused
      outside it, with no implicit wildcard: a token scoped to `prod/*` is refused for
      `prod-staging/x`, and a token scoped to one tag is refused for every other tag.
- [ ] AC10: An external security review of the implementation is recorded as complete before any
      auth code reaches `main`.
- [ ] AC11: A newly created repository rejects unauthenticated reads; after anonymous read is
      explicitly enabled on that repository, an unauthenticated GET succeeds there and remains
      rejected on every other repository.
- [ ] AC12: A request bearing an invalid, expired or revoked credential is rejected with an
      authentication error and is never treated as anonymous, including against a repository
      with anonymous read enabled.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/auth/oidc_test.go` (two providers in containers) |
| AC2 | integration | `internal/auth/local_test.go` |
| AC3 | conformance | `conformance/oci/auth_test.go` |
| AC4 | conformance | `conformance/<format>/auth_test.go` |
| AC5 | integration | `internal/auth/revocation_test.go` |
| AC6 | unit | `internal/auth/token_test.go` |
| AC7 | integration | `internal/auth/leak_test.go` |
| AC8 | unit | `conformance/core/case_validate_test.go` |
| AC9 | architecture test | `internal/auth/arch_test.go` |
| AC10 | manual | recorded in this spec's Review Log; procedure below |
| AC11 | integration | `internal/auth/visibility_test.go` |
| AC12 | integration | `internal/auth/visibility_test.go` |
| AC13 | integration | `internal/auth/bootstrap_test.go` |
| AC14 | integration | `internal/auth/default_grant_test.go` |
| AC15 | integration | `internal/auth/local_admin_test.go` |
| AC16 | integration | `internal/auth/expiry_test.go` |
| AC17 | conformance | `conformance/core/existence_oracle_test.go` |
| AC18 | unit + conformance | `internal/auth/scope_map_test.go`; per-format cases via `format-handler-interface.md` AC7 |
| AC19 | unit + conformance | `internal/auth/pattern_test.go`; per-format cases asserting refusal outside the pattern |

**AC10 procedure**: before the first auth code merges, a security review is performed by a party
other than the implementing agent, covering token lifecycle, scope enforcement, the OIDC
validation path and the OCI token service. The reviewer, date and outcome are recorded in the
Review Log. A spec-level review does not satisfy this; it reviews the implementation.

## Implementation Phases

### Phase 1: Machine identity
Token model, one-way storage (per Q4's answer), scopes, revocation. Ported from Stackweaver's
`apikey` service.

### Phase 2: Human identity
OIDC client, local admin fallback, session issuance.

### Phase 3: OCI token service
Challenge, token endpoint, scoped JWTs. Gated by the official conformance suite.

### Phase 4: Enforcement
Central authorization, the runner-enforced per-format auth cases, architecture tests.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

Q4 through Q12 were raised by the 2026-09-23 security review and await the owner. The resolved
decisions that follow them are kept rather than deleted, so the reasoning survives the next
time someone asks why it was done this way.

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

Accepted cost: a CI job touching ten repositories carries ten scopes or one deliberately broad
token. If that becomes painful in practice it is an argument for a token that carries several
repository scopes, never for widening the scope unit itself.

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
