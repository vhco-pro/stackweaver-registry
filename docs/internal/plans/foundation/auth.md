---
status: draft
status_description: "Drafted from the owner's deployment decisions; blocked on a mandatory external security review before any acceptance criterion may be ticked."
description: "Spec for the two auth surfaces a registry needs: human identity via a standard OIDC client with a local-admin fallback, and machine identity via scoped registry tokens that package clients can actually present."
author: michielvha
goal: "Give every format one auth model that real package clients can use, while keeping passwords, sessions and federation outside our code."
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

### What is outsourced

Everything genuinely dangerous: password storage, session management, MFA, account recovery,
federation, SSO. Those live in the identity provider and no part of this spec reimplements them.

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
- Token hashing via bcrypt, as `apikey/service.go` in Stackweaver already does.
- JWT signing via a maintained library, with keys from the configured signing key.
- **No custom cryptographic scheme anywhere.** A design that invents one is a defect, not a
  trade-off, and reviewers should treat it as such.

Stackweaver has shipped and fuzz-tested the machine half already: bcrypt-hashed keys with a
prefix for fast lookup, a scope model, and HMAC-signed scoped capability tokens. This is a port
of exercised code, not a greenfield design.

### The two surfaces

**Human**: browser hits the UI, OIDC Authorization Code with PKCE against the configured
provider, provider returns identity, we map it to a local principal and issue a session. If no
provider is configured, the local admin account authenticates instead.

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
because pip and Maven have no alternative, not because it is preferred.

**OCI specifically** gets a third path because the distribution spec mandates it: an
unauthenticated request receives a `WWW-Authenticate` challenge naming a realm and scope, the
client exchanges its credential at the token endpoint, and receives a short-lived JWT carrying
the granted scope. That flow is spec-defined, so the official conformance suite exercises it.

### Authorization is central, never per-handler

Per `CLAUDE.md`, auth is a shared concern and handlers must not implement it. Because handlers
receive raw `*http.Request`, the compiler cannot hold this boundary, so it is held mechanically:
every format's conformance case set must include unauthenticated and unauthorized cases, runner
enforced (`format-handler-interface.md` AC7).

### Tokens are never stored recoverable

Only a bcrypt hash plus a lookup prefix is persisted. A token is displayed once at creation and
is unrecoverable afterwards. This is deliberately inconvenient.

## Acceptance Criteria

- [ ] AC1: A user authenticates through any compliant OIDC provider, demonstrated against at
      least two different providers, with no provider-specific code on the path.
- [ ] AC2: With no OIDC configured, the local admin account authenticates and the server is
      fully usable; the account cannot be used once OIDC is configured unless explicitly kept.
- [ ] AC3: `docker login` succeeds against the OCI token flow, and a token scoped to one
      repository **cannot** read another, asserted by a conformance case that expects denial.
- [ ] AC4: `npm`, `pip` and `mvn` each authenticate using the credential form that client
      natively sends, proven by conformance cases running the real clients.
- [ ] AC5: A revoked token is rejected on the next request, with no cached-grant window.
- [ ] AC6: Tokens are stored only as a bcrypt hash plus prefix; a database dump yields no usable
      credential, asserted by a test that reads the row and fails to authenticate with it.
- [ ] AC7: A token or password never appears in logs, error responses or metrics, asserted by an
      integration test that exercises a real failed authentication and scans the emitted output.
- [ ] AC8: Every format's conformance case set contains an unauthenticated and an unauthorized
      case, runner-enforced, and a format missing either fails the suite.
- [ ] AC9: No package under `internal/auth/**` implements a cryptographic primitive; verified by
      an architecture test asserting the allowed library set.
- [ ] AC10: An external security review of the implementation is recorded as complete before any
      auth code reaches `main`.

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

**AC10 procedure**: before the first auth code merges, a security review is performed by a party
other than the implementing agent, covering token lifecycle, scope enforcement, the OIDC
validation path and the OCI token service. The reviewer, date and outcome are recorded in the
Review Log. A spec-level review does not satisfy this; it reviews the implementation.

## Implementation Phases

### Phase 1: Machine identity
Token model, bcrypt storage, scopes, revocation. Ported from Stackweaver's `apikey` service.

### Phase 2: Human identity
OIDC client, local admin fallback, session issuance.

### Phase 3: OCI token service
Challenge, token endpoint, scoped JWTs. Gated by the official conformance suite.

### Phase 4: Enforcement
Central authorization, the runner-enforced per-format auth cases, architecture tests.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

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
