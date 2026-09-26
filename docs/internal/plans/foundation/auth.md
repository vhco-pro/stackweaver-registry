---
status: draft
status_description: "Fold 2026-09-26 at 4d1aeb1 under the owner's standing delegation: Q13-Q17 adopted (patterns within one repository, evaluated against an addressed object added to the pinned Scope type out of cycle; plaintext credentials refused without an explicit flag; the expiry-warning AC deferred to the credential-management surface spec; human grants in the machine vocabulary plus the admin role; single-repository tokens), plus Q18-Q20 raised and adopted in the same pass (segment-glob grammar, content-addressed and repository-wide requests under a pattern, token authority bounded by its owner). Q21-Q22 forced by formats/oci.md's parallel adoptions (a dedicated credential-management spec, owed before OCI Phase 1; multi-repository tokens only by explicit enumerated opt-in, for the two-repository OCI suite credential). Replication's pull widening absorbed. 30 criteria, zero open questions; stays draft pending a gate review. AC10 still requires external review of the implementation regardless of spec status."
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
| `helm` | Bearer or Basic depending on the endpoint |
| `ansible-galaxy` | `Authorization: Token <token>` on every request, including discovery; `Bearer` only under the separate Keycloak `auth_url` flow, Basic only with a configured username/password (captured 2026-09-25 from ansible-core 2.18.18rc1; see `formats/ansible-collections.md`, "The wire contract") |

No identity provider solves this, Zitadel included. It is not an IdP shortcoming: it is a
protocol requirement of 33 separate client tools. **Registry tokens must be issued and verified
by us regardless of which IdP handles humans.**

Per the constitution, the client is the specification and this table is working knowledge, not
ground truth: each row must be confirmed against captured traffic from the real client before
that format's auth conformance cases are written. The `helm` row is the least certain, since
that ecosystem has changed header conventions across versions; the `ansible-galaxy` row is now
grounded in captured traffic rather than recollection.

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
  matching is therefore deny-by-default, has no implicit wildcards, and is covered by
  conformance cases asserting that a narrowly scoped token is refused outside its pattern.
  A pattern narrows within one identity-bound repository and never ranges over repository
  names. The central authorizer matches it against the addressed object each handler's
  `Scope(r)` reports, a field the pinned `Scope` type gained out of cycle for this purpose,
  under the grammar in Design ("Pattern scopes"). AC19 and AC24 through AC26 assert it.
- **Human grants**: the vocabulary between "nothing" and "administer the registry", which is
  per-repository grants in the machine vocabulary plus the single global admin role (Design,
  "Human grants").
- **Token shape**: a token's scopes bind to one repository unless it was created with the
  explicit multi-repository opt-in, and its authority never exceeds its owning principal's
  current grants (Design, the machine surface).
- **Plaintext refusal**: a credential presented over plaintext HTTP is refused unless the
  operator sets an explicit flag (Design, the TLS paragraph).

**Out of scope**

- The token-management product surface (issue, list, revoke), the expiry-warning criterion it
  must carry, and any robot-account principal. They belong to a dedicated sibling spec,
  `foundation/credential-management.md`, which is owed and not yet written, and which must reach
  `planned` before OCI's Phase 1 depends on it. This spec keeps the mechanism and the rules
  that surface must obey (AC6, AC16, AC29, AC30); the obligation is stated in Design, "Token
  expiry".
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
one person.

**TLS is required on every credential-bearing path** - Bearer, Basic, the Galaxy `Token` form,
and the OCI token endpoint - since Basic is plaintext without it. The server enforces this
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

**OCI specifically** gets a third path because the distribution spec mandates it: an
unauthenticated request receives a `WWW-Authenticate` challenge naming a realm and scope, the
client exchanges its credential at the token endpoint, and receives a short-lived JWT carrying
the granted scope. That flow is spec-defined, so the official conformance suite exercises it.

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
decision below), owed and not yet written, whose token surface `formats/oci.md` made a Phase 1
dependency when it adopted registry tokens as the `docker login` credential. That spec is
incomplete without the criterion: on its surface a token's expiry must be visible, and a token
nearing expiry distinguishable from a healthy one, before the token fails.

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
mapping, from its own routes to a `Scope` - the repository, the action, and the object the
request addresses - and the shared layer evaluates that mapping and enforces the result. Format
knowledge stays in the format - including OCI's slash-bearing repository names under `/v2/`,
which would otherwise put per-format URL grammar into security-critical shared code. The
addressed object is what pattern scopes match against; it entered the pinned `Scope` type
(`format-handler-interface.md`, "The pinned method set") as an out-of-cycle amendment made for
this spec's pattern-evaluation decision.

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

### Pattern scopes

Per the 2026-09-23 scope decision, **path and tag patterns layer on that base unit**, and per
the resolved pattern-evaluation decision below they narrow **within** one repository: a scope is
`(repository, action)` plus an optional pattern over the objects inside that repository. A
pattern never ranges over repository names, so the identity-binding rule above holds without an
exception, and a fleet-style grant over `prod-*` repositories is not expressible.

**What the authorizer matches against.** Beside the repository and action, the pinned `Scope`
type carries the object the request addresses, which the handler reports because only the
handler can parse its URL grammar. The object has one of three kinds:

| Kind | Meaning | Example routes |
|---|---|---|
| named | the handler's canonical name for the finest named thing the route addresses | a generic artifact path; an OCI manifest by tag; an npm package name |
| content-addressed | the route reads or writes content identified by digest, or an upload bound to a digest when it commits | an OCI blob, a manifest by digest, an upload session |
| none | the route addresses the repository as a whole, including every route whose response enumerates names | a generic listing; an OCI tag list or catalog |

Which object each route reports is format knowledge, declared in each format's spec alongside
its route-to-scope mapping; this spec fixes only the kinds and how they evaluate.

**How a patterned scope evaluates** (the resolved requests-naming-no-object decision below). A
scope with no pattern authorizes its action on every request to its repository, whatever the
kind. A scope with a pattern authorizes:

- a **named** object only when the name matches the pattern;
- a **content-addressed** object for `pull` and `push`, and never for `delete`;
- a **none** object never.

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
table-tested per route (`format-handler-interface.md` AC12).

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
- [ ] AC8: Every format's conformance case set contains an unauthenticated, an unauthorized and
      a pattern-refusal case (a token patterned to one named object refused on another) in both
      modes (honouring a declared unsupported mode per `Capabilities()`), runner-enforced, and a
      format missing any of them fails the suite - the same contract
      `format-handler-interface.md` AC7 and the harness's case-set validation state.
- [ ] AC9: No package under `internal/auth/**` implements a cryptographic primitive; verified by
      an architecture test asserting the allowed library set.
- [ ] AC13: Configuring OIDC without naming at least one admin identity is rejected, and after
      a successful OIDC configuration that named identity can administer the registry while the
      local admin no longer authenticates.
- [ ] AC14: A brand-new identity from the provider authenticates successfully and can perform no
      action on any repository until explicitly granted; once the admin grants it `pull` on one
      repository it can pull there and nothing else - not push there, and not pull elsewhere.
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
- [ ] AC22: The session cookie is issued with HttpOnly, Secure and SameSite set; a
      state-changing UI request without a valid CSRF token is rejected; and logout invalidates
      the session server-side, after which the old cookie no longer authenticates.
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
- [ ] AC27: With the plaintext flag unset, a request presenting a Bearer, Basic or `Token`
      credential over a connection the server did not terminate with TLS is refused with an
      error stating that credentials require TLS, identically for a valid and an invalid
      credential, without the credential being looked up or logged, and never answered as
      anonymous; an `X-Forwarded-Proto: https` header does not change the outcome. With the
      flag set the same request authenticates normally, and a request presenting no credential
      is unaffected either way.
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
| AC19 | unit + conformance | `internal/auth/pattern_test.go` (the matcher, with a `FuzzPatternMatch` target asserting a wildcard-free pattern matches only itself and `*` never matches across `/`); per-format pattern-refusal cases in both modes via `format-handler-interface.md` AC7 |
| AC20 | integration | `internal/auth/oidc_test.go` (per-binding tamper cases) |
| AC21 | integration | `internal/auth/principal_test.go` |
| AC22 | integration | `internal/auth/session_test.go` |
| AC23 | integration | `internal/auth/token_service_test.go` (algorithm confusion; mid-flight key rotation) |
| AC24 | unit + conformance | `internal/auth/pattern_test.go` (evaluation per object kind and action); `conformance/oci/auth_test.go` (tag-scoped pull of a multi-architecture index; refused digest delete and tag list); `conformance/generic/auth_test.go` (refused listing) |
| AC25 | unit | `internal/auth/pattern_test.go` (validation table over each refused form) |
| AC26 | integration | `internal/auth/token_service_test.go` (patterned exchange; multi-repository token request) |
| AC27 | integration | `internal/auth/plaintext_test.go` (flag unset and set, valid and invalid credential, spoofed forwarding header, no-credential request) |
| AC28 | integration | `internal/auth/grant_test.go` |
| AC29 | integration | `internal/auth/token_scope_test.go` (single-repository default, refused and accepted multi-repository creation, unnamed repository refused); the cross-repository mount under an opt-in token is also exercised by `formats/oci.md` AC1's suite run |
| AC30 | integration | `internal/auth/token_owner_test.go` |

**AC10 procedure**: before the first auth code merges, a security review is performed by a party
other than the implementing agent, covering token lifecycle, scope enforcement, the OIDC
validation path and the OCI token service. The reviewer, date and outcome are recorded in the
Review Log. A spec-level review does not satisfy this; it reviews the implementation.

## Implementation Phases

### Phase 1: Machine identity
Token model, one-way storage (per Q4's answer), single-repository scopes (several
repositories only by the explicit opt-in) with optional patterns validated against the grammar,
the owner-intersection rule, revocation, and the plaintext refusal on every credential path. Ported from Stackweaver's `apikey` service.

### Phase 2: Human identity
OIDC client, local admin fallback, session issuance, human grants and the admin role.

### Phase 3: OCI token service
Challenge, token endpoint, scoped JWTs carrying any pattern, subset grants for multi-repository
requests. Gated by the official conformance suite.

### Phase 4: Enforcement
Central authorization over the three addressed-object kinds, the runner-enforced per-format
auth and pattern-refusal cases, architecture tests.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None remain open. Q13 through Q17 were raised by the 2026-09-24 gate review and adopted on
2026-09-26 under the owner's standing delegation, together with Q18 through Q22, raised and
adopted in the same pass: Q18 to Q20 because folding exposed them, Q21 and Q22 because sibling
adoptions in `formats/oci.md` landed on this spec that day; each adopted record opens by
saying so, and the owner may reverse any of them. Q1 through Q12 are all resolved (Q1-Q3 on
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

**Why this is yours:** it decides what a tag-scoped credential actually protects on a
content-addressed format, which operators will read as a promise.

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

Accepted cost: the extra lookup, and CI that breaks when its owner is removed. This spec defines
no robot-account principal; the credential-management surface spec is where one would arrive.
B lost because the offboarding hole is the failure SSO exists to prevent; C lost because it is an
escalation primitive.

**Why this is yours:** it trades offboarding safety against CI stability, and it decides what
removing a person from the registry actually does.

### Resolved: where the token-management surface is specced (was Q21, raised and adopted 2026-09-26)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a dedicated sibling
spec, `foundation/credential-management.md`, owns token issuance, listing and revocation as a
product surface, the expiry-warning criterion, and any future robot-account principal. It is
owed and not yet written, and must reach `planned` before OCI's Phase 1, which depends on it.
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
surface-placement record above (was Q21): `foundation/credential-management.md`, owed. B lost because it would quietly spec the first
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
