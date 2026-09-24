---
status: draft
status_description: "Gate review 2026-09-24 at 1701a48: eleven of twelve resolved decisions verified applied; pattern scoping found half-applied and unimplementable against the pinned Scope(r). Four security ACs added (AC20-AC23, now 23 criteria), AC7/AC8 tightened, one port attribution corrected. Stays draft on Q13-Q17. AC10 still requires external review of the implementation regardless of spec status."
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
  The evaluation mechanism and the pattern grammar are unresolved (Q13); AC19 states the end
  state and is blocked on that answer.

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
HTTP outside development is a misconfiguration the deployment documentation must name. As
written this is the one risky state in the spec that documentation alone guards, while every
comparable one (anonymous read, non-expiring tokens, the kept break-glass account) requires an
explicit opt-in; whether plaintext credential acceptance should likewise require a deliberate
flag is Q14.

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
step, deliberately. What that grant *is* - the human-side authorization vocabulary the central
evaluator applies between "nothing" and "administer the registry" - is not yet defined anywhere
in this spec, and is Q16.

### Token expiry

Registry tokens **expire by default**, with a non-expiring token available only by deliberate
opt-in - the same shape as the anonymous-access decision, where the risky state requires someone
to choose it.

Accepted cost: a CI token that silently expires breaks a pipeline at an inconvenient moment.
Expiry warnings must therefore be visible well before the event, not delivered as a 401. No
acceptance criterion polices that obligation yet, because no token-management surface (issue,
list, revoke as a product surface) is specced here - `formats/oci.md` Q3 owns that surface -
and an AC against an unspecced producer is untestable, the same reasoning
`supply-chain-policy.md` applied to its absent signature AC. Where the warning criterion lands
is Q15.

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

Per the 2026-09-23 scope decision, **path and tag patterns layer on that base unit** - a
credential scoped to `prod/*` or to a single tag "rather than a whole repository", so a pattern
narrows a scope to part of one repository. Read that way it leaves the identity-binding rule
above untouched; if the owner instead intends patterns to range over repository *names*, that
is a recorded exception to identity binding, because a name pattern is name-matching by
definition. Either way the mechanism is currently missing: the pinned `Scope(r)`
(`format-handler-interface.md`) hands the central authorizer only a repository and an action,
so the shared layer never learns the path or tag a request addresses and AC19 cannot be
implemented as things stand; the pattern grammar (character set, whether `*` crosses a
separator, what the addressed object is per format) is likewise undefined. Both are Q13. How
many repositories one token's scopes may span is also ambiguous between two of this spec's own
passages, and is Q17.

One inbound amendment is pending rather than missing, recorded here so it arrives as a
revision to a named section instead of a surprise: `replication.md` Q6 needs an
instance-to-instance identity for a follower's reads of snapshot internals, and both of its
options touch this vocabulary - widening what `pull` grants, or adding a `replicate` action.
That question is owned and answered there; this spec absorbs the outcome as a revision.

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
      integration test that exercises both a real failed authentication and a real successful
      one and scans the emitted output of each - a request logger that echoes Authorization
      material leaks on the success path, which a failed-path-only scan never sees.
      The single exception is the first-start local admin credential (AC15), emitted once by
      design; the test asserts that exactly one such emission occurs and that nothing else leaks.
- [ ] AC8: Every format's conformance case set contains an unauthenticated and an unauthorized
      case in both modes (honouring a declared unsupported mode per `Capabilities()`),
      runner-enforced, and a format missing either fails the suite - the same contract
      `format-handler-interface.md` AC7 and the harness's case-set validation state.
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
- [ ] AC20: An OIDC callback whose `state` does not match an initiated flow, whose `nonce` does
      not match, whose PKCE verifier fails, or whose ID token fails signature, issuer, audience
      or expiry validation is rejected with no session issued - asserted by integration tests
      that tamper with each binding individually.
- [ ] AC21: The local principal is keyed on `(issuer, subject)` alone: a changed email claim on
      an unchanged `(issuer, subject)` resolves to the same principal with its grants intact,
      and an identical email claim arriving from a different `(issuer, subject)` resolves to a
      distinct principal holding no grants.
- [ ] AC22: The session cookie is issued with HttpOnly, Secure and SameSite set; a
      state-changing UI request without a valid CSRF token is rejected; and logout invalidates
      the session server-side, after which the old cookie no longer authenticates.
- [ ] AC23: The OCI token service rejects a token whose header names any algorithm other than
      the configured one, including `none`, regardless of its signature; and a signing-key
      rotation leaves already-issued tokens verifiable via `kid` until their expiry while new
      tokens are signed with the new key, with no failed pull across the rotation.

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
| AC20 | integration | `internal/auth/oidc_test.go` (per-binding tamper cases) |
| AC21 | integration | `internal/auth/principal_test.go` |
| AC22 | integration | `internal/auth/session_test.go` |
| AC23 | integration | `internal/auth/token_service_test.go` (algorithm confusion; mid-flight key rotation) |

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

Q13 through Q17 were raised by the 2026-09-24 gate review and await the owner. Q1 through Q12
are all resolved (Q1-Q3 on 2026-09-23 from the original draft, Q4-Q12 answered 2026-09-23
after the security review that raised them); the resolved records that follow are kept rather
than deleted, so the reasoning survives the next time someone asks why it was done this way.

### Q13: How does the central authorizer evaluate a path or tag pattern, when the pinned `Scope(r)` hands it only a repository and an action?

The 2026-09-23 scope decision layers path and tag patterns onto the repository scope unit, and
AC19 asserts the end state. But `format-handler-interface.md` pins `Scope(r)` returning a
`Scope` that is "a repository plus one of `pull`/`push`/`delete`", so the shared layer never
learns the path or tag a request addresses and has nothing to match a pattern against. The
pattern grammar is also undefined (character set, whether `*` crosses a separator, what the
addressed object is per format: a path for generic, a tag for OCI, a package for npm). And the
range needs confirming: the Scope section's own wording ("scoped to `prod/*` or to one tag
rather than a whole repository") reads as within-repository narrowing, which preserves the
identity-binding rule; a pattern over repository *names* would instead be a recorded exception
to it, since name patterns are name-matching by definition.

**Recommendation:** A - grow the pinned `Scope` type now with an optional addressed-object
field the handler supplies, patterns constrained to within one identity-bound repository
scope. `Scope(r)` itself entered the pin as a security-driven amendment "needed from the first
format", and this is the same shape: AC19 is unimplementable without it, and evaluating
patterns anywhere else puts either auth checks in handlers or per-format grammar in shared
code, both forbidden.

| Option | You get | It costs |
|---|---|---|
| **A. Amend the pinned `Scope` type now: repository, action, plus the addressed object (path/tag/package) where the route names one; patterns are within-repository** | AC19 implementable from the first format; identity binding untouched; one evaluator holds every grant decision | A second amendment to the pinned method set outside the scheduled re-open, and every handler must correctly surface the addressed object or its pattern grants are unenforced (the AC18/AC7 catch extends to cover this) |
| **B. Ship repository-granularity scopes first; patterns ride the post-OCI interface re-open** | The pin stays untouched until its scheduled evidence gate; the re-open designs the field from two real handlers | The owner's 2026-09-23 decision to bring patterns into scope is deferred, AC19 sits unimplementable in a `planned` spec, and CI credentials are repository-wide until Tier 1 |
| **C. Patterns also range over repository names, evaluated centrally against the name** | Fleet-style grants (`prod-*` repositories) with no interface change for the name half | A recorded exception to the identity-binding rule this spec calls "how stale grants silently reattach", and the tag half still needs A anyway |

**Why this is yours:** every option either amends a sibling's pinned contract outside its
scheduled re-open, defers a decision you explicitly made, or carves an exception to a rule this
spec treats as an account-takeover defence - the constitution says that choice is raised, never
taken silently.

### Q14: Does accepting credentials over plaintext HTTP require an explicit opt-in flag, or only documentation?

Every other risky state in this spec requires someone to choose it: anonymous read,
non-expiring tokens, the kept break-glass account. Plaintext credential acceptance - the state
that turns every Basic-auth password into cleartext on the wire - is currently guarded by a
line in the deployment documentation and nothing else.

**Recommendation:** A - refuse credential-bearing requests over plaintext unless an explicit
flag (`--allow-plaintext-auth` or equivalent, doubling as the behind-a-terminating-proxy
declaration) is set. It is the same opt-in-to-risk posture the rest of the spec already
follows.

| Option | You get | It costs |
|---|---|---|
| **A. Secure by default: plaintext credential acceptance requires an explicit flag** | The dangerous state is unrepresentable by accident, consistent with the spec's own posture; a misconfigured deployment fails loudly at first login instead of leaking silently | Every behind-a-proxy deployment (the common production shape) must set the flag, and a wrong guess about what the proxy terminates produces a confusing startup-vs-runtime failure |
| **B. Documentation only, as currently written** | Zero deployment friction; the server stays agnostic about what sits in front of it | The one credential-leaking misconfiguration in the spec is also the only one nothing mechanical prevents, and it fails silently for exactly as long as nobody looks |

**Why this is yours:** it trades a secure default against friction in the most common
deployment topology, which is a product-posture call, not a measurable one.

### Q15: Where does the token expiry-warning criterion land, given no token-management surface is specced here?

The resolved expiry decision obliges warnings "visible well before the event, not delivered as
a 401", and no acceptance criterion polices it - deliberately, because this spec defines no
issue/list/revoke product surface for the warning to live on, and `formats/oci.md` Q3 (open,
owner-pending) owns that credential-management surface. An AC against an unspecced producer is
untestable, the precedent `supply-chain-policy.md` set for its absent signature AC.

**Recommendation:** A - the warning criterion lands in the credential-management surface spec
that oci.md Q3's answer creates, and this spec records the outbound dependency; the obligation
is already stated here so it cannot be lost.

| Option | You get | It costs |
|---|---|---|
| **A. Defer the AC to the credential-management surface spec; record the dependency here** | No invented surface colliding with oci.md Q3's pending product decision; the AC arrives testable against a real surface | The settled obligation stays unpoliced until that spec exists, and if oci.md Q3 stalls, so does this |
| **B. Define a minimal observable now (expiry visible in a token listing; a near-expiry state distinguishable) and add the AC here** | The settled decision becomes enforceable immediately | This spec quietly specs the first slice of the token-management surface before the owner has decided its shape, pre-empting oci.md Q3 |

**Why this is yours:** it sequences a promised safeguard against a product-surface decision you
have not made yet - a spec-portfolio call, the same class as supply-chain-policy Q6.

### Q16: What is the human-side authorization model between "nothing" and "administer the registry"?

The machine side is fully specified: scopes of `(repository, action)`. The human side has two
defined states - a brand-new identity holds nothing, and a named admin can administer the
registry - and an "explicit grant step" whose vocabulary is never stated. Two implementors
diverge immediately: per-repository ACL entries mirroring the machine vocabulary, or named
role bundles per repository, or global roles.

**Recommendation:** A - human grants are `(principal, repository, action)` using the same
`pull`/`push`/`delete` vocabulary, plus the single global admin role that already exists for
bootstrap. One vocabulary, one central evaluator for both identity kinds, and pattern scoping
(Q13) then applies uniformly.

| Option | You get | It costs |
|---|---|---|
| **A. Per-repository grants in the machine vocabulary, plus the global admin role** | One evaluator and one vocabulary for humans and machines; AC14's "explicitly granted" becomes concrete with no new concepts | Granting a team of ten across ten repositories is a hundred rows with no grouping; "manage this repository's grants" needs `admin` to stretch or a fourth action later |
| **B. Named per-repository roles (reader/writer/maintainer) that bundle actions** | Matches what operators expect from Harbor/GitLab; delegation ("maintainer can grant") is expressible | A second authorization vocabulary beside the scope one, and the translation layer between them is exactly what the scope-unit decision refused to build |
| **C. Global roles only in v1** | Trivial to build and explain | Repository-private-by-default becomes hollow: anyone granted read reads everything, which contradicts the visibility model this spec just settled |

**Why this is yours:** it is the permission product surface every onboarding flow, UI screen
and support conversation is built on, and the trade between vocabulary purity and operator
expectations is not measurable.

### Q17: May one registry token carry scopes on several repositories?

Two passages support opposite readings. Design says verification resolves a token "to a
principal plus its scopes" and the scope-unit resolution keeps "a leaked token's blast radius
to one repository" - singular. But its accepted-cost line says a CI job touching ten
repositories "carries ten scopes or one deliberately broad token", and names "a token that
carries several repository scopes" as the future escape hatch, implying today's token cannot.

**Recommendation:** A - a token's scopes all bind to one repository (several actions on it are
fine); multi-repository tokens are the recorded escape hatch, adopted only if single-repository
tokens prove painful in practice. That is the reading the blast-radius rationale supports.

| Option | You get | It costs |
|---|---|---|
| **A. Single repository per token; several actions allowed** | The blast-radius property holds by construction; token rows and revocation stay trivially per-repository | A CI job spanning ten repositories manages ten tokens, and the "painful in practice" trigger for revisiting is subjective |
| **B. Several repository scopes per token now** | One credential per CI job; the escape hatch never needs a migration | A leaked token's blast radius is whatever its author accumulated, and the scope-unit resolution's central rationale is quietly given up |

**Why this is yours:** the credential shape CI users script against is a product promise, and
your own resolved Q2 text can be read either way - only you know which you meant.

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
| 2026-09-24 | 1701a48 | gate review (draft -> planned decision): folded-decision application over all 12 resolved records + adversarial + cross-spec (format-handler-interface's pinned `Scope(r)`, conformance-harness case validation, oci/generic client contracts, replication Q6, supply-chain-policy's precedent invocation) + constitution + go-spec-reviewer. Claim verification vacuous pre-code: no `internal/auth/**` exists, the tree holds only a stub `cmd/stackweaver-registry/main.go`; the one checkable claim set, the Stackweaver `apikey` port, was re-verified against that repo and one attribution corrected. Independent: this reviewer authored none of the spec's prior content | Gate not passed; stays `draft` on Q13-Q17. Eleven of twelve resolved decisions verified genuinely applied through Scope, Design, ACs and Test Plan; the twelfth, pattern scoping, is half-applied - present in Scope and AC19, absent from Design, and unimplementable against the pinned `Scope(r)` which returns only repository+action (Q13). Corrections applied: HMAC capability tokens re-attributed to `registry_artifact_token.go` (they are not in the apikey service); stale Open Questions intro (claimed Q4-Q12 awaited the owner; all were resolved); AC8 restored to "in both modes", matching interface AC7 and the harness's description of this very criterion; AC7 extended to scan a successful authentication's output, not only a failed one. Four Design-named security duties had no policing criterion and gained one each: AC20 (OIDC flow bindings and ID-token validation rejected per-tamper), AC21 ((issuer, subject) keying against email remap/collision), AC22 (session cookie flags, CSRF on state-changing UI routes, server-side logout), AC23 (token-service algorithm confusion and mid-flight key rotation). Raised Q13 (pattern evaluation vs the pinned Scope shape, grammar, and range), Q14 (plaintext credential acceptance: opt-in flag vs docs-only, the one risky state not behind an explicit choice), Q15 (where the promised expiry-warning criterion lands, given oci.md Q3 owns the unspecced token-management surface), Q16 (human-side grant vocabulary between "nothing" and "administer"), Q17 (single- vs multi-repository token scopes, ambiguous between two of the spec's own passages). Replication's pending inbound amendment (instance-to-instance identity) recorded in Scope vocabulary so it arrives as a revision, not a surprise. AC10's external implementation review stands untouched; nothing in this pass satisfies it. |
