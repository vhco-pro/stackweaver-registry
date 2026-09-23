---
status: draft
status_description: "First review pass 2026-09-23 at 3e3ae0a: security-lens hardening applied (visibility ACs, identity mapping, token generation, TLS, token-service duties) and Q4-Q12 raised for the owner; stays draft until they are answered. AC10's external security review of the implementation remains a separate, mandatory gate."
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
- **Authorization**: repository-scoped permissions, evaluated centrally, never in a handler.

**Out of scope**

- Local *user management*: no user CRUD, no groups, no password reset, no MFA, no lockout policy.
  The local account is a bootstrap path, not a user system. Teams wanting users configure OIDC.
- Making Stackweaver an identity provider for this registry. Pointing both products at the same
  IdP already delivers one central login without coupling their release cycles. Deferred, not
  rejected.
- Fine-grained policy (per-path, per-tag rules). Repository-scoped is the v1 unit.

## Design

### Nothing is invented

This is the binding constraint of the whole spec, and it is stated as a rule rather than a
preference:

- OIDC via a maintained standard library (`coreos/go-oidc`). **No hand-rolled token validation,
  no hand-parsed JWTs, no custom signature checking.**
- Registry tokens are generated from `crypto/rand`, at least 256 bits, encoded with a
  non-secret prefix used only for lookup and display. The token string carries no structure
  beyond that prefix: no embedded claims, no identifiers, nothing parseable.
- Tokens are stored one-way (which one-way function is Q4), as Stackweaver's `apikey` service
  already does with bcrypt.
- JWT signing via a maintained library, with keys from the configured signing key.
- **No custom cryptographic scheme anywhere.** A design that invents one is a defect, not a
  trade-off, and reviewers should treat it as such.

Stackweaver has shipped the machine half already: bcrypt-hashed keys with a prefix for fast
lookup, a scope model, and HMAC-signed scoped capability tokens, with fuzz targets over prefix
handling and key verification (`backend/internal/services/apikey/` in that repo, verified
2026-09-23). This is a port of exercised code, not a greenfield design - though "exercised"
holds for the code, not for its cost profile on a registry request path (Q4).

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
short enough to be measured in minutes, because that lifetime is also the revocation window
(Q5); and the signing key is dedicated to this service and rotatable without failing in-flight
pulls (`kid` selection is the standard mechanism). The concrete claim set, the key's provenance
and its storage are implementation decisions AC10's external review must cover explicitly.

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

What an unauthorized caller may learn about a private repository's existence is Q11.

### Authorization is central, never per-handler

Per `CLAUDE.md`, auth is a shared concern and handlers must not implement it. Because handlers
receive raw `*http.Request`, the compiler cannot hold this boundary, so it is held mechanically:
every format's conformance case set must include unauthenticated and unauthorized cases, runner
enforced (`format-handler-interface.md` AC7).

### Tokens are never stored recoverable

Only a one-way hash plus a lookup prefix is persisted (which one-way function is Q4; either
answer keeps this section true). A token is displayed once at creation and is unrecoverable
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
- [ ] AC5: A revoked token is rejected on the next request, with no cached-grant window. (How
      this criterion applies to OCI tokens already issued against a revoked credential is Q5;
      its answer amends this wording.)
- [ ] AC6: Tokens are stored only as a one-way hash plus a lookup prefix (the hash function is
      Q4); a database dump yields no usable credential, asserted by a test that reads the row
      and fails to authenticate with it.
- [ ] AC7: A token or password never appears in logs, error responses or metrics, asserted by an
      integration test that exercises a real failed authentication and scans the emitted output.
- [ ] AC8: Every format's conformance case set contains an unauthenticated and an unauthorized
      case, runner-enforced, and a format missing either fails the suite.
- [ ] AC9: No package under `internal/auth/**` implements a cryptographic primitive; verified by
      an architecture test asserting the allowed library set.
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

### Q4: How is a presented token verified on every request: bcrypt, or a fast hash suited to high-entropy secrets?

**Recommendation:** B - a 256-bit random token does not need a slow hash; bcrypt's cost is a
defense low-entropy passwords need, and a registry pays that cost on every one of the hundreds
of requests a single `npm install` or `docker pull` makes.

| Option | You get | It costs |
|---|---|---|
| **A. bcrypt compare per request (the port as-is)** | Stackweaver's exercised code unchanged; safety margin if a weak token ever exists | Tens of milliseconds of CPU per request, multiplied across every request a client operation makes; the obvious fix is a verification cache, which AC5 forbids |
| **B. SHA-256 (or HMAC) of the token, constant-time compare** | Microsecond verification, so AC5 holds with no cache; a dump still yields nothing, because reversing a 256-bit random preimage is infeasible | Diverges from the ported code, and loses bcrypt's margin should the generation rule ever be violated |
| **C. bcrypt plus a short in-memory grant cache invalidated on revocation** | Keeps bcrypt and acceptable latency | Exactly the cached-grant window AC5 rules out, plus cross-instance invalidation the moment there is a second server |

**Why this is yours:** it rewrites AC6 and constrains AC5, and it trades an exercised port
against request-path performance - which the charter names as invisible to conformance, so no
gate will catch the wrong choice.

### Q5: When a credential is revoked, do OCI tokens already issued against it survive until expiry?

**Recommendation:** A - accept the token lifetime as the bounded revocation window and amend
AC5 to name it, because checking revocation on every JWT use deletes the reason the OCI flow
exists.

| Option | You get | It costs |
|---|---|---|
| **A. Bounded survival: the JWT's short expiry is the revocation window, named in AC5** | Stateless verification; the flow the distribution spec describes | A revoked credential keeps its granted access for up to one token lifetime |
| **B. Check the issuing credential's revocation on every JWT-bearing request** | AC5 stays literally true | Every OCI request pays a database lookup; the JWT degenerates into a session pointer |
| **C. A `jti` denylist consulted at verification** | Fast propagation, stateless in the common case | A denylist to populate, replicate and expire, added to the most security-sensitive code in the product |

**Why this is yours:** AC5 as written is false for the OCI path as designed, and only the owner
decides whether the criterion or the flow gives way.

### Q6: How does central authorization learn which repository and action a request is for?

**Recommendation:** A - the handler declares a route-to-scope mapping the shared layer
evaluates, because the alternative moves per-format URL grammar into security-critical shared
code.

| Option | You get | It costs |
|---|---|---|
| **A. Handler declares a per-route (repository, action) mapping; the shared auth layer evaluates it** | Format knowledge stays in the handler, evaluation stays central; OCI's `/v2/` name grammar is parsed where it is understood | The pinned interface gains a method, and a wrong mapping is now an authorization bug a handler can cause - AC8's unauthorized cases become the mechanical check on it |
| **B. Central middleware parses `/{format}/{repository}/...` generically, OCI special-cased** | No interface change | The auth layer accretes per-format URL knowledge, against the interface spec's spirit, and every future carve-out lands in shared security code |

**Why this is yours:** it amends the interface method set that `format-handler-interface.md`
settled with a scheduled re-open, and it decides where authorization bugs can originate.

### Q7: Once OIDC is configured and the local admin is disabled, how does the first registry administrator exist?

**Recommendation:** A - configuring OIDC requires naming at least one admin identity before
the local admin is disabled, making the locked-out state unrepresentable without trusting
provider claims.

| Option | You get | It costs |
|---|---|---|
| **A. OIDC configuration requires naming an admin principal; the switch refuses otherwise** | No brickable transition, no trust in provider group data | One more required configuration field; a mistyped identifier still locks out (the keep flag is the recovery) |
| **B. First OIDC login after configuration becomes admin** | Zero configuration | A race that anyone able to authenticate can win; on a provider with open registration that is privilege escalation by timing |
| **C. Map a provider group or claim to registry admin** | Enterprise-native, survives personnel change | Trusts provider-controlled claims for the highest privilege, leaks per-provider claim shapes into configuration, and quietly turns shared login into shared authorization - the exact conflation Design warns against |

**Why this is yours:** it is the recovery story for AC2's disable decision, and each option
places trust differently between the operator and the provider.

### Q8: What does a brand-new identity arriving from the provider receive by default?

**Recommendation:** A - nothing: authentication succeeds, authorization is empty until
granted; private-by-default for repositories implies nothing-by-default for principals.

| Option | You get | It costs |
|---|---|---|
| **A. No permissions until granted** | SSO cannot silently widen access; consistent with the anonymous-access resolution | Every onboarding needs an explicit grant, which small teams will feel |
| **B. A configurable default role, defaulting to none** | Per-deployment flexibility | A configuration axis that can make every SSO-capable user a reader of everything - the misconfiguration the visibility resolution exists to prevent, reintroduced one level up |

**Why this is yours:** Design explicitly names default-role policy as a decision separate from
authentication, and no spec has made it; it is the difference between SSO as a door and SSO as
a grant.

### Q9: How is the local admin credential created and delivered to the operator?

**Recommendation:** A - generated from `crypto/rand` at first start and shown exactly once,
with AC7 amended to carve out that single, deliberate emission.

| Option | You get | It costs |
|---|---|---|
| **A. Generated at first start, shown once on the console** | High entropy guaranteed; no operator ritual; brute force is moot even though Scope declines a lockout policy | The one place a credential deliberately meets process output - AC7 needs a named carve-out or its leak test forbids the mechanism |
| **B. Operator-supplied via environment or config file** | Never appears in output | Operators pick weak passwords, and with no lockout policy in scope a guessable admin password on an internet-facing registry has no brute-force brake |
| **C. Generated to a file with restrictive permissions** | Off the console and out of logs | Container and Kubernetes deployments must mount and retrieve it; the first-run path grows moving parts |

**Why this is yours:** it is the first credential the product ever creates, the spec currently
says nothing about it, and the options trade first-run ergonomics against AC7's absolutism and
the deliberately absent lockout policy. Whatever the delivery, the stored form is a password
hash - bcrypt is right here regardless of Q4, because an operator-facing password cannot be
assumed high-entropy.

### Q10: Do registry tokens expire?

**Recommendation:** C - default expiry with an explicit non-expiring opt-in, the same shape as
the anonymous-access resolution: the risky state exists only by deliberate action.

| Option | You get | It costs |
|---|---|---|
| **A. Mandatory maximum lifetime** | Every leak has a bounded blast radius | Breaks the set-and-forget CI norm every incumbent registry honours; rotation tooling becomes a prerequisite for adoption |
| **B. Optional expiry, non-expiring by default** | Matches npm and PyPI expectations; no rotation treadmill | A leaked non-expiring token is valid until someone notices; revocation is the only brake |
| **C. Default expiry, explicit non-expiring opt-in** | A secure default; the escape hatch is a recorded decision | One more choice at token creation, and the CI documentation must teach it |

**Why this is yours:** it is a product promise CI pipelines get built against, and changing it
later invalidates users' automation rather than our code.

### Q11: What does an unauthorized caller learn about a private repository's existence?

**Recommendation:** A - missing and forbidden are indistinguishable to a caller without read
access, because private repository names are often guessable and a distinct 403 enumerates
them.

| Option | You get | It costs |
|---|---|---|
| **A. Indistinguishable: the same not-found or challenge response for missing and forbidden** | No existence oracle across tenants; aligns with the direction of `oci.md` Q5 on mounts | Worse debuggability - "missing or forbidden" requires server logs to answer |
| **B. Honest 403 for exists-but-forbidden** | Operators and users see the true failure | Any authenticated user can enumerate private inventory by guessing names |

**Why this is yours:** the sibling `oci.md` Q5 covers only the cross-repository mount path and
is still open; this is the same trade for every read path in every format, and it constrains
what status codes AC8's unauthorized cases assert.

### Q12: What is the action vocabulary of a scope?

**Recommendation:** A - OCI's `pull`, `push` and `delete` for every format, because the scope-
unit resolution was justified by needing no translation from OCI's grammar, and a second
vocabulary would reintroduce exactly that layer.

| Option | You get | It costs |
|---|---|---|
| **A. OCI's verbs everywhere; each format maps its operations onto them** | One grammar; the OCI flow needs no mapping, so the resolution's rationale holds | Non-OCI operations without a clean verb (retention configuration, repository settings) must be shoehorned or declared out of token reach |
| **B. Generic verbs (read, write, delete, admin), mapped to OCI's at the token endpoint** | Natural fit for the other 32 formats and for admin surfaces | The translation layer the scope-unit resolution was chosen to avoid, now living in the token service |

**Why this is yours:** every format's conformance auth cases assert against these exact
strings, and changing the vocabulary after two formats ship re-opens their case sets. The
scope-unit resolution also mentions "one deliberately broad token" without defining what
breadth exists; the answer here should say whether anything wider than a repository list (an
all-repositories or admin scope) is expressible at all.

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
