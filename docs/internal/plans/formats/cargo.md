---
status: planned
status_description: "Planned by the Fable recheck of 2026-10-08 at dc98bf7: full review of the Opus reconciliation and re-examination of its one adoption (Q7 confirmed, with the first-fetch check shown to be the right discriminator and its failure a 502, never a negative entry); the Fable-authored folds of Q2 and Q5 amended (the owners routes under push with the refusal after authorization, since a pre-authorization refusal with a body was unimplementable under FHI AC10 and the pull listing disclosed publishers; a repository-independent login_url, since a per-repository one could never be byte-identical). Refuted against the Cargo book: the dependency-rename mapping was inverted (the index swaps name and package relative to the publish JSON; AC13). Found and fixed: the advisory key must be the registered spelling because Package.name is folded (new AC22); the publish body under the one spool bound with its claim and a bounded Scope(r) read, recorded as a re-open input (new AC23); the serving door (ServeRendered lazy form, ServeFile, ServeDocument, HEAD; AC1); the virtual resolves by exact spelling, not the folded key (AC20); the write and private-read corpus halves need harness exception rows (AC16); AC11 waits a real shortened TTL; AC4's install message names the yank only for an exact version. Earlier: reconciled 2026-09-28 at 15ced69 on Opus (Q7 adopted, AC17 inverted, AC19 to AC21) and 2026-09-26 at da0aecd (Q6 adopted); authored 2026-09-26 from captures of cargo 1.70.0 and 1.98.1. Seven questions adopted under the standing delegation, none open. Awaits /tasks."
description: "Spec for the Cargo (Rust) registry format: the sparse index protocol and the crates.io-style web API, hosted and proxied, with cargo as the conformance oracle for reads, publish and yank alike."
author: michielvha
goal: "Serve Rust teams a private crate registry and a crates.io cache from one handler, with every management operation cargo itself can drive verified through the real client."
priority: "medium"
issue: 17
created: 2026-09-26
covers:
  - "internal/format/cargo/**"
  - "conformance/cargo/**"
---

# Plan: Cargo registry format

The Cargo sparse index protocol and the registry web API, hosted and proxied, with `cargo` as
the oracle for every operation on the surface, including yank, which here is a real client
command rather than a management endpoint only our own tests can drive.

## Context

Cargo sits in Tier 2 of `formats/catalogue.md` under its own single-member family ("Cargo sparse
index"), so it carries no family multiplier and no client-reach claim beyond `cargo` itself. What
it does carry is an unusually clean protocol split: **reads are a static-file contract** (a
`config.json` plus one JSON-lines file per crate, fetched over plain HTTP with conditional
requests), and **writes are a small JSON web API** that crates.io defined and the Cargo book
documents. Both halves are published, the client source is open, and the client is trivially
containerised, so this is a format where the standing rule that the client is the specification
can be discharged before a line of handler code exists.

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** No Rust toolchain is installed on this host (`which cargo` finds
  nothing, no `~/.cargo` or `~/.rustup`), so two pinned client images were run in containers
  against a logging stub registry: `cargo 1.70.0` (the release that made the sparse protocol
  crates.io's default) and `cargo 1.98.1` (current at authoring). Every row of the wire table
  below was observed on both unless the row says otherwise. The stub is not a reference
  implementation; it answered with the shapes the Cargo book documents, and what the captures
  prove is what the client sends and how it reacts, which is the half no document states
  reliably.
- **The published contract.** The Cargo book's registry index, registry web API, registry
  authentication and credential-provider pages, the cargo source for the sparse client
  (`http_remote.rs`), the publish wait (`cargo_publish.rs`), the index lookup (`index/mod.rs`)
  and `cargo add` (`cargo_add/mod.rs`), and the Rust release notes for the version milestones.
- **The live upstream.** `index.crates.io` sampled directly: its `config.json`, a crate file's
  response headers (`ETag`, `Last-Modified`, `Cache-Control: public,max-age=600`), a 304 on
  `If-None-Match`, a 404 on a missing crate and on a wrong-case path, and the download
  endpoint's `cache-control: public,max-age=31536000,immutable`.

Where the contract is unpublished the design says so and names what it was grounded against
instead. Per the standing rule, the recorded corpus re-grounds every row when the conformance
cases are written, and the corpus wins any disagreement.

Two things make this format worth a careful spec rather than a port of the PyPI one. First, the
per-crate index file is a **generated, append-only document that changes on every publish and
every yank**, so the hosted path has a write-triggered document without the signing that makes
Debian's expensive; how it is produced decides whether hosted Cargo is a rendering problem or a
materialisation problem. Second, `cargo yank` and `cargo owner` are **real client commands**, so
unlike PyPI and Galaxy this format's management surface has a third-party oracle for both trigger
and effect, which is the distinction `docs/internal/analysis/management-surfaces-and-the-oracle.md`
draws, and this format is recorded there beside npm. That makes Cargo npm's case, not PyPI's:
under the cross-format precedent `pypi.md`, `npm.md` and `ansible-collections.md` adopted, yank
and unyank are operations of the registry-owned management API, and cargo's own routes are
served as bindings onto them (Design, "Yank is a binding onto the registry-owned operation"; the
resolved yank-binding decision below). Its yank criteria stay ordinary conformance cases,
because the real client drives the trigger.

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every
Tier 1 and Tier 2 handler (`format-handler-interface.md` AC8). Cargo is Tier 2, so in practice
the catalogue's Tier 1 gate (its AC5) and the charter's breadth re-evaluation (build-order step
8) both precede it; the re-open is recorded here anyway, from this side, because a gate enforced
on one side only is enforced nowhere.

**The breadth gate decides whether this format is built at all.** `formats/catalogue.md` AC5
forbids Tier 2 work until Tier 1 is complete and the continue-or-shrink verdict is in the
experiment log, and `project-charter.md` AC9 forbids any Tier 2 handler code on `main` before an
owner-recorded `continue` verdict (after `shrink`, this spec is `parked`). This spec exists now so the catalogue's AC1 (a spec before any code) holds and
so the format's traps are on record before the gate, not to pull the format forward.

**The management API is the home of yank and unyank.** Yank and unyank are
bindings onto the `withdraw` and `restore` kinds of
`docs/internal/plans/foundation/management-api.md`'s closed operation vocabulary, whose kind
table and cross-format reconciliation table carry Cargo's row (`DELETE .../yank` and
`PUT .../unyank` as the bindings, `delete` as the action, the resolved withdraw-action decision,
was Q1 there), and the handler declares them through that spec's optional `Operator` interface
(its resolved dispatch decision, was Q2). That spec owns their shared shape, authorization and
write accounting; it reached `planned` on 2026-09-30, so nothing in Phase 2 waits on it any
longer, and the later decisions of it this handler consumes are the binding rule (was Q13), the
claim a wire write declares (was Q14), the central refusal rendered in the wire's shape (was
Q16) and the one spool bound on every publish body (was Q20).

## Scope

**In scope:**

- The sparse index protocol: `config.json`, the sharded per-crate index files, conditional
  requests with `ETag` and 304, and the `sparse+` URL scheme.
- Crate download at the `dl` endpoint, with the `.crate` bytes verified against the index's
  `cksum`.
- The registry web API as cargo drives it: publish with its length-prefixed binary body, yank
  and unyank as bindings onto the registry-owned management operations, the owners endpoints,
  and search.
- The per-route addressed objects `auth.md`'s pattern scopes evaluate (AC17), and the wire
  rendering of a shared policy refusal (AC18).
- Registry-token authentication in the exact form cargo sends: the bare token as the whole
  `Authorization` header value, the `auth-required` flag, and the `WWW-Authenticate: Cargo`
  challenge that makes cargo present the token on index and download requests.
- Name rules: the lowercase index path, the case-preserved JSON `name`, and refusal of names
  that collide with an existing crate under case folding or hyphen/underscore folding (the
  resolved name-collision decision below).
- The proxied path against a sparse upstream (crates.io or a private sparse registry):
  classification, `config.json` rewriting, conditional revalidation against the upstream's
  `ETag`, negative caching, Cargo's rows of the upstream-removal table, and the upstream binding
  `upstream-adapters.md` shapes (an `https://` root, the download host on the allowlist).
- The write-boundary declaration `data-model.md` requires, with yank and unyank as metadata-only
  writes.
- The handler's `Capabilities()` declaration, repository rename and virtual aggregation
  (Design, "Capabilities and lifecycle").
- The serving door for every read: hosted index files through `ServeRendered`'s lazy form,
  `.crate` files through `ServeFile`, a remote's cached index files through `ServeDocument`,
  and `HEAD` answered on every read route as the `GET` without its body (Design, "The index
  file is rendered").
- The publish body's bound and claim: the one spool bound `management.publish_spool_limit`,
  the `{crate}/{version}` claim a publish declares on its write transaction, and the
  package-level advisory key (the registered spelling) reported on both paths.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **The git index protocol**, hosted and as an upstream (the resolved git-protocol decision
  below). Not effort: a git smart-HTTP server is a different serving stack from the HTTP handler
  this interface defines, a git upstream needs a git client in the handler's egress path, which
  is exactly the third-party-egress bypass `format-handler-interface.md` AC9 exists to close,
  and the Cargo book itself recommends a registry offer one canonical protocol because the index
  URL is lockfile identity. The client has spoken sparse since 1.68 and used it by default for
  crates.io since 1.70, and the 1.70.0 capture ran sparse-only.
- **Asymmetric tokens.** The Cargo book's stable built-in credential providers (`cargo:token`,
  `cargo:wincred`, `cargo:macos-keychain`, `cargo:libsecret`, `cargo:token-from-stdout`) all
  deliver an opaque token string the registry sees identically; the asymmetric-token scheme is
  listed on the unstable-features page, and `auth.md`'s nothing-is-invented rule means this
  registry verifies no self-signed token scheme until it is stable and a maintained library
  implements it.
- **Owner semantics beyond a listing.** `cargo owner --add` and `--remove` are refused with the
  reason in the body (the resolved owners decision below), because per-crate ownership is
  authorization evaluated in a handler, which the constitution forbids; per-crate grants are
  the within-repository pattern scopes `auth.md` settled (its resolved pattern-evaluation
  decision, was Q13), evaluated centrally against the addressed object this handler reports,
  and an owners mutation would be a second write path into grant state.
- **Signatures and provenance.** Nothing on the Cargo wire carries a signature or an
  attestation: the index is unsigned, `.crate` files are unsigned, and the only integrity
  primitive is the index `cksum`. There is nothing here for
  `docs/internal/plans/foundation/artifact-verification.md`, the producer
  `supply-chain-policy.md` settled (its resolved verification-ownership decision, was Q6), to
  verify: that spec's per-format table lists Cargo under "Nothing", so every Cargo digest
  answers `absent` and the conformance matrix's verification column reads `none` with this spec
  cited (its AC24; `catalogue.md` AC7). Nothing is asked of `signing-service.md` either (its
  consumer table, "Nothing, stated"): the index is rendered on read, below. Advisory matching
  for crates is the policy engine's coordinate-level path (`supply-chain-policy.md`, "What the
  feed covers": crates.io is covered through OSV's RustSec data) and needs no handler
  cooperation.
- **The crates.io-only surfaces**: the `/api/v1/crates/{name}` JSON detail, download counts,
  categories, keywords and the web UI. No cargo command consumes them (`cargo info`, present in
  1.98.1 and absent in 1.70.0, reads the index only, captured), so a claim in the matrix would
  have no oracle behind it.

## Design

### The wire surface, as captured

| Surface | Shape, as both pinned clients send it |
|---|---|
| Registry config | `GET {index}/config.json`, where `{index}` is the configured `sparse+` URL with the prefix stripped. Response: `dl`, `api`, and `auth-required: true` for a registry that needs a token on reads. cargo fetches it before anything else, once per command |
| Crate index file | `GET {index}/{shard}/{name}` with the name **lowercased** by the client: `1/{n}`, `2/{n}`, `3/{first}/{n}`, `{first two}/{next two}/{n}` for four or more characters (captured: `zz/fo/zzfoo`, `zz/ba/zzbar` for a crate published as `ZzBar`). Body: one JSON object per line, per version, in publish order |
| Index request headers | `cargo-protocol: version=1` and `accept: text/plain` on every index request; `if-none-match` carrying the stored `ETag` on every refresh; `Authorization` only when `auth-required` was seen. `User-Agent` is `cargo 1.70.0 (...)` on the old client and `cargo/1.98.1 (...)` on the new one |
| Crate download | `GET {dl}/{crate}/{version}/download`, the suffix cargo appends when `dl` carries none of the `{crate}`, `{version}`, `{prefix}`, `{lowerprefix}` or `{sha256-checksum}` markers; `{crate}` is the **registered spelling** (captured `/dl/ZzBar/0.1.0/download`), `Accept: */*`, no protocol header, `Authorization` only under `auth-required` |
| Publish | `PUT {api}/api/v1/crates/new`, `Content-Type: application/octet-stream`, `Accept: application/json`, `Authorization: <token>`. Body: a 32-bit little-endian length, the JSON metadata, a 32-bit little-endian length, the `.crate` bytes. Response: `{"warnings":{"invalid_categories":[],"invalid_badges":[],"other":[]}}` |
| Yank, unyank | `DELETE {api}/api/v1/crates/{name}/{version}/yank` and `PUT .../unyank`, both authenticated, both answered `{"ok":true}` |
| Owners | `GET`, `PUT` and `DELETE {api}/api/v1/crates/{name}/owners`, authenticated; `PUT` and `DELETE` carry `{"users":["login"]}`; `GET` expects `{"users":[{"id","login","name"}]}`, the mutations expect `{"ok":true,"msg":"..."}` and print `msg` |
| Search | `GET {api}/api/v1/crates?q={query}&per_page=10`, **with no `Authorization` header even when a token is configured** (captured on both). Response: `crates[]` of `name`, `max_version`, `description`, and `meta.total` |
| Login | Not a request. `cargo login` fetches `config.json`, prints `{api}/me` as where to obtain a token (1.70.0 prints it; 1.98.1 does not), reads the token from stdin and stores it in `credentials.toml` |
| Errors | `{"errors":[{"detail":"..."}]}`; the client prints `detail` verbatim. It parsed that body as a failure even on a 200 (captured on 1.70.0), so refusals carry a 4xx and this body |

Two client behaviours around publish shape the hosted write path:

- **1.98.1 checks the index before uploading.** It fetched `zz/fo/zzfoo`, saw the version
  present, and refused the duplicate client-side ("already exists on `test` index") without a
  `PUT`. 1.70.0 sent the `PUT` and relied on the server's `errors[].detail`. Both generations
  therefore exist in the corpus and both refusals must hold.
- **Publish is not finished until the index reflects it.** After the `PUT`, cargo polls the
  crate's index file once a second for up to 60 seconds (`cargo_publish.rs`: `DEFAULT_TIMEOUT`
  60, `sleep_time` one second, an exact-version query per poll) and reports a timeout if the
  version does not appear. The registry's index for the head snapshot must therefore reflect a
  publish by the time the `PUT` returns; a registry whose index lags its API by more than a
  minute breaks every publish, and one that lags at all makes `cargo publish` slow for no reason.

### The index file is rendered, never stored as a document of record

The per-crate file is a projection: one line per version, each line derivable entirely from that
version's stored metadata, concatenated in publish order, with `yanked` the only field that
changes after a line is written (the Cargo book: "the JSON objects should not be modified after
they are added except for the `yanked` field"). The hosted handler renders it from the snapshot
the pointer names, exactly as npm renders its packument and PyPI its simple index, and serves it
through the lazy form of `ServeRendered`, the serving door `signing-service.md` provides through
`Documents` in `Deps` (its resolved handler-rendered decision, was Q14;
`format-handler-interface.md` AC17): the handler passes a renderer and a validator identity made
of the folded key and the serving snapshot's identity, with the serving pointer as the freshness
source, and the runtime derives the strong `ETag` from that identity and the pointer's
`moved_at` without rendering, so a `304` costs no render, a repoint (promotion or rollback)
changes the `ETag` and invalidates every client's cached copy on its next refresh, and no code
in `internal/format/cargo` sets a validator or reads a conditional header (that spec's AC11 and
AC32). The same door answers a `HEAD` on the index file as the `GET` with the body withheld,
`Content-Length` included (its resolved `HEAD` decision, was Q24), which cargo never sends and
`curl -I` does. The `.crate` download is `ServeFile` over the version's `File`, whose strong
`ETag` is the CAS digest, the same value the index advertises as `cksum`.

The mapping onto the shared model, using exactly the levels `data-model.md` provides:

- `Package.name` holds the **folded key**: lowercase, with `_` replaced by `-`. The folded key
  is what the collision rule below makes unique, and it is what an index request is resolved
  against after the same folding. The **registered spelling** (`ZzBar`) lives in the
  package-level metadata document and is what every index line's `name` carries, because the
  JSON `name` is case-sensitive to the resolver (captured: a hand-written dependency `zzbar`
  against a crate registered `ZzBar` fails with "packages with similar names: ZzBar", while
  `cargo add zzbar` translates to `ZzBar`, and 1.70.0 prints "translating `zzbar` to `ZzBar`").
- Each `Version` holds the publish metadata as its version-level document: the dependency list
  (with the wire's `version_req` stored as the index's `req`; a renamed dependency is
  **swapped** between the two documents: the publish JSON carries the original crate as `name`
  and the rename as `explicit_name_in_toml`, while the index line carries the rename as `name`
  and the original crate as `package`, which is what the Cargo book's two schemas state and
  what crates.io emits, so a line that copied the publish fields across unswapped would make
  cargo resolve the wrong crate), `features`, `links`, `rust_version`, the descriptive fields the web API
  carries, the `yanked` flag, and the publish time that the optional `pubtime` index field
  surfaces (the live crates.io index emits it).
- The `.crate` file is the version's single `File`; its `Blob` is keyed by the CAS sha256, which
  is exactly the value the index advertises as `cksum`. The CAS computes it server-side and the
  index never advertises a digest the store did not verify, the same rule PyPI's spec states;
  the format's checksum and the storage key happen to coincide here, but the key is still the
  CAS's digest of the received bytes, never a value the client supplied.
- **The advisory key is the registered spelling.** `Package.name` is the folded key, so a crate
  registered `serde_json` is stored as `serde-json`, while OSV's RustSec records name crates as
  crates.io spells them; matched on the stored name, every underscore-bearing crate would escape
  its advisories. The handler therefore reports the registered spelling as the package-level
  advisory key in the metadata-store write that records the package, on the hosted path from the
  publish JSON and on the proxied path from the index line's `name`, and on the fetch-and-cache
  request of a proxied miss (`supply-chain-policy.md`'s resolved advisory-key decision, was Q11,
  its AC24; `data-model.md` AC46), matched under the Cargo semver ordering that spec vendors
  (AC22).
- **Feature-syntax splitting is the registry's job.** The publish body carries one `features`
  map, and entries that use the `dep:` prefix or the `pkg?/feat` weak-dependency syntax belong
  in the index's `features2` with `v` set to 2, which is how crates.io serves them and what the
  Cargo book's schema-version rule describes. Cargo 1.60 and later honour `v: 2`; nothing older
  than 1.68 can reach this registry at all, so the split costs nothing and omitting it would
  serve a line the book says older readers cannot parse.
- The repository-level document holds nothing on the hosted path: `dl` and `api` derive from the
  externally visible base URL, and `auth-required` derives from the repository's visibility
  (below). A remote repository's document caches the upstream's `config.json`.

The relationship to `write-triggered-services-prototype.md` is stated so the re-open is not
misled by the word "generated": this document is **package-scoped, unsigned, and a pure function
of version rows**, so it is not the repository-scoped signed class the prototype exists for. A
publish is one `Version`, one `File`, one snapshot; no regeneration step, no secret, and no
contention beyond the ordinary revision token on the package-level document.

### Names: three foldings, only one of them the client's

The trap has three layers, and a registry that conflates them serves 404s to correct clients or
lets two crates shadow each other:

1. **The index path is lowercase, always, on the client side.** Cargo lowercases the name to
   build the path (captured `zz/ba/zzbar` for `ZzBar`, and the live index answers 404 to
   `se/rd/Serde`). Two crates whose names differ only by case would share one index file, so
   case-insensitive uniqueness is forced by the format, not chosen.
2. **The JSON `name` is case-sensitive to the resolver.** The index line must carry the
   registered spelling; a request under another case still reaches the file, and the client
   translates or hints as captured above.
3. **Hyphen and underscore are not folded by the client on lookup.** A request for `zz_foo`
   fetches `zz/_f/zz_foo`, and when that misses cargo itself fetches the permutation
   `zz/-f/zz-foo` (captured on both versions, in both directions; `index/mod.rs`: "we only try
   canonicalizing `-` to `_` and vice versa", used to offer a "similar crate exists" hint that
   the resolver then rejects as a wrong-name candidate). The live index confirms `serde_json`
   and `serde-json` are distinct paths, and only the former exists.

The rules, stated as rules:

- A crate is addressed by its folded key for lookup and uniqueness, and served under its
  registered spelling. An index request whose lowercase name does not equal the registered
  spelling lowercased answers 404 even when the folded key matches (so the underscore spelling
  never serves the hyphen spelling's lines): the client already asks for the other spelling
  itself, and serving wrong-name lines only produces a confusing candidate.
- A publish whose name collides with an existing crate under case folding **or** under
  hyphen/underscore folding is refused with the reason in `errors[].detail` (the resolved
  name-collision decision below). Case collision is forced by layer 1; separator collision is
  crates.io's own rule, recommended to registries by the Cargo book, and it is what stops a
  private `foo_bar` from shadowing `foo-bar` inside cargo's own permutation lookup.
- Character rules follow the Cargo book's crates.io list: ASCII alphanumeric plus `-` and `_`,
  first character alphabetic, at most 64 characters, Windows reserved names refused.

### Authentication: a bare token, and the challenge that unlocks it

Cargo does not speak Bearer or Basic. Captured on both clients: the `Authorization` header value
is **the token string alone, with no scheme**, on every web API request that the Cargo book
marks as authenticated, and on index and download requests only after the client has learned
the registry requires it. Learning it is a two-step dance the registry must perform exactly:

1. The client fetches `config.json` with no credential. A registry that needs a token on reads
   answers **401** with `WWW-Authenticate: Cargo login_url="<url>"` (the source parses only the
   `Cargo` scheme and only the `login_url` parameter). The URL is **repository-independent**:
   `{server.public_url}/ui/tokens`, the web UI's Tokens page (`web-ui.md`), where a human mints
   the token `cargo login` then asks for. A per-repository `{api}/me` would embed the repository
   name, so the challenge for a private and a missing repository could never be byte-identical,
   which is what the existence rule asks of it (below, AC6).
2. The client retries `config.json` with the token, reads `auth-required: true`, and from then on
   sends the token on every index file and every download (captured: the `authdl` request
   carried it, the public `dl` request did not).

Only 1.74 and later do this: the Rust 1.74.0 release notes record "Stabilize credential-process
and registry-auth", and the 1.70.0 capture failed hard at the first 401 ("failed to get
successful HTTP response ... got 401") without retrying. **A private repository is therefore
unusable by any cargo older than 1.74**, while a repository with anonymous read enabled serves
every sparse-capable client from 1.68. The version floor is a property of the ecosystem's own
auth design and is recorded in the matrix rather than worked around.

How this meets `auth.md`, whose rules this spec does not bend:

- **The handler renders the challenge; the shared layer decides.** As `formats/oci.md` does for
  its `WWW-Authenticate` challenge, the Cargo handler owns the wire form of the denial and the
  central authorizer owns the verdict. The mapping the handler declares through `Scope(r)`:
  `config.json`, index files, downloads and search are `pull`; publish is `push`; the three
  owners routes are `push` on `{crate}`: the listing because it discloses publisher identities,
  which `management-api.md`'s resolved operator-visibility decision (was Q17) admits only to
  principals who could originate a write there, and the mutations because they are refused
  **after** authorization with the explanatory body (the resolved owners decision below, as
  amended), so an unauthorized caller meets the existence rule's denial and never the
  explanation; yank and unyank are `delete`, as the registry-owned operation they bind onto
  requires (below). The addressed
  object each route reports is declared in "Addressed objects and pattern scopes".
- **The challenge is not an existence oracle.** For a credential-less request the handler
  answers 401 with the challenge **uniformly**, whether the repository is private, missing, or
  belongs to someone else; for a request carrying a valid token that lacks `pull` the answer is
  404, indistinguishable from a missing repository, exactly as `auth.md` AC17 requires. A
  rejected credential (invalid, expired, revoked) answers 401 with the challenge and is never
  downgraded to anonymous (`auth.md` AC12); 1.98.1 renders that as "token rejected" when it
  had already seen `auth-required`.
- **`auth-required` is a projection of visibility, never of the upstream.** A private
  repository's `config.json` carries `auth-required: true` and challenges; a repository with
  anonymous read enabled omits the field and serves reads to anyone, while publish, yank and
  owners still demand the token because the client always sends it there. On the proxied path
  the field describes **this** repository's visibility; the upstream's own credential, if any,
  is the upstream adapter's business and never leaks into what clients are told.
- **The token verifier accepts a scheme-less `Authorization` value.** This is a third credential
  form beside Bearer and Basic, and `auth.md` now carries it: its presentation-forms table lists
  the scheme-less form (the whole `Authorization` value is the token) and its client table has a
  `cargo` row with the bare token and the `WWW-Authenticate: Cargo login_url` challenge, each
  confirmed against this spec's captures as that spec requires before a format's auth cases are
  written.
- **Search cannot authenticate, by the client's own contract.** The captures show no
  `Authorization` on search even with a token configured, so on a private repository `cargo
  search` is refused like any other credential-less request. That is honest and unavoidable; a
  registry that answered anonymous search on a private repository would disclose its crate
  names. Search works on anonymously readable repositories, and the limitation is recorded in
  the matrix.

The harness needs nothing new: the case writes the issued token into the client container as
`CARGO_REGISTRIES_<NAME>_TOKEN` (the `cargo:token` provider reads it, and it is the only stable
provider that does), sets `registries.<name>.index` to the `sparse+` URL, and lists
`registry.global-credential-providers = ["cargo:token"]` explicitly, which is the Cargo book's
documented default for that key and is ignored by 1.70.0, so one client configuration serves
both pinned versions. Cargo keys a credential by registry **name**, never by host, so several
repositories on one host each take their own token under their own `[registries.<name>]`
entry, and `auth.md`'s single-repository tokens need no multi-repository opt-in here. TLS interception for
the transcript uses `http.cainfo` (`CARGO_HTTP_CAINFO`), the per-client trust-store injection
`conformance-harness.md` leaves to each format.

### What counts as a write

`data-model.md` requires each format spec to declare its ecosystem's write boundaries and makes
metadata-only mutations snapshot-creating writes. Cargo's declaration:

- **One publish `PUT` is one completed logical write**: the version, its single file and the
  index line it produces land in one snapshot, and the index rendered from the head snapshot
  reflects it before the response is sent, because the client polls for it.
- **Each yank and each unyank is one metadata-only write**, flipping the version's `yanked`
  flag and producing a snapshot. Yank deletes nothing: the Cargo book says a yanked version "will
  still be available for download", and the capture confirms an existing lockfile downloads the
  yanked version while a fresh resolution refuses it. A registry that removed the file on yank
  would break every lockfile that pins it, which is the precise failure yank exists to avoid.
- A yank or unyank is the same one write whichever entry point drives it, cargo's own route or
  the registry-owned management endpoint it binds onto (below).
- Owners mutations are refused and write nothing; the owners listing is a read.
- **A republish of an existing version is refused** with the reason in the body and leaves no
  snapshot behind, matching the public registry. The `.crate` at a coordinate is the immutable
  artifact this registry's own proxy layer caches forever, and 1.98.1 refuses the duplicate
  client-side anyway, so accepting it would only ever be observed by old clients and downstream
  caches, silently. No operation on this format deletes a version, so no coordinate is ever
  retired and no `Retirement` record is written: `withdraw` and `restore` retire nothing
  (`management-api.md`'s kind table), and the existing-coordinate refusal is the handler's own
  check against the head snapshot. The publish still declares `{crate}/{version}` as its claim
  on the write transaction it opens through `Deps` (that spec's resolved claimed-coordinate
  decision, was Q14; `storage-and-gc.md` AC30), vacuous while nothing retires and declared
  anyway so the uniform check holds on this path too. This format declares **no** unchanged
  publish (that spec's was-Q15): a byte-identical republish is refused like any other, because
  1.98.1 refuses it client-side and crates.io refuses it on every version, so there is no
  keyless CI retry to admit.
- **The publish body is spooled under the one bound.** Both framed segments are read through
  the bounded spool `Deps` hands the handler, under `management.publish_spool_limit`
  (`management-api.md`'s resolved spool-bound decision, was Q20; its AC36): a length prefix
  that alone exceeds the bound, or a declared `Content-Length` that does, is refused `413` with
  the `errors` body before a byte is spooled, and a body that outgrows the bound undeclared is
  cut and refused with nothing kept, in this wire's shape (that spec's was-Q16), never the
  API's problem document. The handler never reads the key.
- A proxied repository creates no snapshots at all; index arrival and revalidation are cache
  materialisation.

### Yank is a binding onto the registry-owned operation

The cross-format precedent (`pypi.md`'s resolved hosted-yank decision, was Q1, with `npm.md` and
`ansible-collections.md`) makes every management operation an operation of one registry-owned
management API, `docs/internal/plans/foundation/management-api.md`, and where an ecosystem
client drives an operation over its own wire, that route is served as a **binding onto the same
operation**, as npm's `-rev` routes are. Cargo is that case: the `DELETE .../yank` and
`PUT .../unyank` routes above are bindings onto the `withdraw` and `restore` kinds, declared
through the handler's `Operator` interface (`Operations()` and `Bindings()`), with one
implementation behind two ways in (the resolved yank-binding decision below). A binding has no
behaviour of its own (that spec's binding rule): its `Scope(r)` reports exactly the operation's
object and action, and the binding and the API produce the same snapshot delta. What that fixes:

- **Authorization is `delete`, the same as PyPI's yank.** The action follows the kind, never the
  format (`management-api.md`'s kind table; its resolved withdraw-action decision, was Q1), and
  `withdraw` sits on the `delete` side because its whole purpose is to take a version out of new
  resolutions. A principal holding `push` alone publishes but cannot yank, which is more than
  crates.io asks of an owner, and is the accepted cost. `auth.md` records the settlement in the
  same words and no longer carries the "Cargo yank under `push`" divergence.
- **Hosted only.** A yank against a proxied or virtual repository answers `405` with problem type
  `repository-type`, identically through the API and through the binding (its AC7); its yanks
  arrive from the upstream per the removal table below.
- **Nothing is deleted.** Yank flips a flag in one snapshot, and the `.crate` stays served, as
  the write-boundary declaration above states; `withdraw` retires nothing.
- **The owners mutations are not management operations.** They are refused after
  authorization under `push` on `{crate}`, writing nothing (the resolved owners decision below,
  as amended), so there is no operation for them to bind onto; `management-api.md` records them
  as refused rather than bound, and its "before scope evaluation" wording is a queued wording
  consequence.

What this format required of `management-api.md`, and what that spec provides: a `withdraw` and
a `restore` operation on a version, `Authorize` reporting the object `{crate}/{version}` in the
canonical form below, exactly one metadata-only snapshot per completed operation (its AC5), and
the bindings above reaching the same `Apply` with identical semantics and authorization (this
spec's AC19; its AC8 holds every declared binding's `Scope(r)` equal to `Authorize` and the two
entry points' snapshot deltas byte-identical, and its AC9 refuses a Cargo yank to a `push`-only
principal); the management-API entry point is `POST /api/v1/repositories/{name}/operations` with
kind `withdraw` or `restore` and target `{crate}/{version}`; the trigger is verified by this registry's integration tests plus the `script`-driven case its
AC24 requires for every declared kind, and the effect by the real client.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). The canonical crate name is the **folded key** the
model already stores, lowercase with `_` replaced by `-`, not the registered spelling: a pattern
must match byte for byte against a canonical form, the index request arrives lowercased by the
client, and the folded key is computable from every spelling any route carries, so `acme-*`
covers `Acme_Tool` however a request spells it.

| Route | Object kind | Canonical object |
|---|---|---|
| `config.json` | descriptor | - (protocol configuration: `dl`, `api` and `auth-required`; it names no crate, version or digest) |
| Crate index file | named | `{crate}` |
| Crate download | named | `{crate}/{version}` |
| Publish | named | `{crate}/{version}`, from the metadata JSON, which the length-prefixed body carries before the `.crate` bytes: `Scope(r)` reads the four-byte length and the JSON up to a package-level constant bound (1 MiB, far above any crates.io metadata), restores both for `ServeHTTP`, and returns an error above the bound or on malformed JSON, denied as `format-handler-interface.md` AC10 denies it; so no unauthorized crate is spooled, and validation after authorization refuses a `.crate` whose manifest disagrees with the JSON, the coherence check `auth.md`'s body-reading rule owes (below) |
| Yank and unyank | named | `{crate}/{version}` |
| Owners listing and mutations | named | `{crate}`, all three under `push` (above) |
| Search | none | - |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. Every cargo
command fetches `config.json` first. Under the three original object kinds that document
addressed the repository as a whole and a credential holding **only** a patterned `pull` was
refused at the first request, so no cargo command worked under it; `auth.md`'s resolved
name-free-document decision (was Q23) added the fourth kind for exactly this document, and Cargo
was the case that raised it. `config.json` reports **descriptor**: a repository-wide document
whose body carries no name, version or digest of any object the repository holds, which a
patterned `pull` may read, held by the sentinel test `format-handler-interface.md` AC12 runs on
every descriptor route (a sentinel crate seeded, `config.json` fetched, any sentinel in the body
failing the table). A patterned-only `pull` therefore **runs cargo end to end**: it reads
`config.json`, fetches the index files and downloads of in-pattern crates and is refused another
crate's index file, in both modes, which AC17 asserts. Search stays `none`, since it enumerates
names, and is refused to a patterned credential as it already is to any credential-less request.
Pattern narrowing is therefore practical on both sides of this format: a CI credential confined
to its own crates holds `pull`, `push` and `delete` all patterned `acme-*/**`, and fetches,
publishes and yanks only those crates; where helm, dnf and zypper still need an unpatterned
`pull` because their first document enumerates names, cargo does not.

The publish object is read from the request body, which the pinned interface's `Scope(r)` was
not written to do. `format-handler-interface.md` ("What `Scope(r)` may read") admits
body-derived objects for Chef and Galaxy under `auth.md`'s condition (the result reaches the
caller only as the authorization outcome, identical for an out-of-pattern object and a missing
one, and an artifact whose own metadata disagrees with the declared object is refused after
authorization), and bounds the interim read to a multipart part's headers. Cargo's leading
segment is the JSON itself, so the read in the table is the same class under the same
condition but outside that interim bound's letter; it is recorded there as a re-open input for
this handler, which as Tier 2 lands after the re-open, and the bound in the table is what this
spec promises until then.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on an
index-file or download route of either path, the handler answers `403` with the `errors` body
this format uses for every refusal, its `detail` naming the policy and rule, or naming the
signal for a coordinate condemned under the shared security-signal rule, written through the
shared refusal writer `WriteRefusal` in `internal/format` (`format-handler-interface.md` AC14),
which on an HTTP/1.1 connection also writes the status line
`HTTP/1.1 403 Refused by policy: {condition}` (`supply-chain-policy.md`'s resolved
refusal-status-line decision, was Q10, and AC18). `403` rather than the existence rule's `404`,
because the caller is authorized and the content is what is refused; `451` is never used for a
policy refusal, because cargo treats it as a security signal (the removal table below). The
client prints `detail` verbatim on API refusals (captured); whether it does so on an index or
download refusal is what AC18's case proves, and the same case captures whether `cargo` falls
back to another configured source on the refusal, filling Cargo's `pending` row of
`supply-chain-policy.md`'s "When a refusal binds, per format" table in the same change (its AC20;
the harness refuses a policy case while the row is `pending`, `conformance-harness.md` AC26).

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`:

- **`config.json` is never served verbatim.** It is mutable metadata with a TTL as a cache
  entry, but what clients receive is always this registry's own document: `dl` and `api`
  pointing at this repository's format-first URLs and `auth-required` derived from this
  repository's visibility. The upstream's `dl` template (with every marker the Cargo book
  defines) is what the handler uses to compose upstream download URLs; the fetch itself goes
  through the `https` adapter of `upstream-adapters.md`, which follows the upstream's redirects
  inside the adapter and never hands a `Location` to a client (its AC8; crates.io's `api`
  download path answers 302 to `static.crates.io`). The download host is therefore an
  off-origin host of the upstream, reachable only through the upstream's allowlist (below).
  This is the same format-specific transform `format-handler-interface.md` canonicalises with
  npm's packument URLs, and it likewise needs the externally visible base URL, not the bind
  address: the handler reads it as `deployment.md`'s `server.public_url` through `Deps`, as npm
  and PyPI do, until the re-open settles its home. Without it every proxied download goes
  straight past the cache.
- **Per-crate index files are mutable metadata with a TTL**, revalidated conditionally: the live
  `index.crates.io` serves `ETag` and `Last-Modified` and answered 304 to `If-None-Match`, so an
  unchanged file costs a 304, not a re-download. The cached document is served to clients under
  this registry's own `ETag` and the cache-scoped `Last-Modified` of `proxy-cache.md`'s
  freshness record (its AC22: forward-moving on every adopted revision, `304` only on an exact
  match, an older upstream revision never adopted), and clients' own `If-None-Match` refreshes
  are answered 304 from the cache without touching the upstream inside the TTL. The cached
  file is a current document of the remote at the package level, served through
  `ServeDocument`, never LRU-evicted and counted in `cache_metadata_bytes{repository}`
  (`proxy-cache.md`'s resolved metadata-eviction decision, was Q21, its AC29); the upstream's
  `config.json` is the repository-level one; the handler declares a retained-revision count of
  **zero** (its was-Q19 and was-Q22), because no route reads a superseded index file, and the
  `.crate` is a cached file under its own reference, so nothing on this path is kept alive by
  mention alone (the data-loss audit every format sweep owes). Every adoption runs under anchor
  class `none` with verdict `absent`, since nothing on this wire is signed, so its was-Q23 has
  nothing to compare and `signing-service.md` AC36 never binds a virtual over a Cargo remote.
  A `HEAD` on any proxied route is the `GET` with its body withheld, cache-filling and never
  forwarded (its was-Q24, AC32). Index lines pass
  through unmodified except for one field: a `registry` value equal to the upstream's own index
  URL is normalised to null, so that "this registry" keeps meaning the repository the client is
  talking to.
- **`.crate` files are immutable artifacts**: cached indefinitely (crates.io itself serves them
  `immutable` with a one-year max-age), fetched stream-and-verify against the `cksum` of the
  index line this registry served, never committed on a mismatch or truncation; the
  fetch-and-cache request carries the registered spelling as the advisory key, so a condemned
  version is refused before any upstream request (`supply-chain-policy.md` AC24).
- **Missing crates are negatively cached** with the short TTL. The Cargo book lists 404, 410 and
  451 as the "crate does not exist" statuses and the client treats them alike; all three are
  negatively cached, and clients always see 404. A 429 or 5xx is never cached as absence
  (`proxy-cache.md` AC9).
- The `cargo-protocol: version=1` request header is logged, never required: `curl` and other
  tools read sparse indexes too.

**The upstream binding, as `upstream-adapters.md` shapes it.** A Cargo remote's `Upstream` row
names the sparse index root as an `https://` URL, which is the Cargo client's `sparse+` URL with
the client-side `sparse+` prefix removed: the prefix tells cargo which protocol to speak and
names nothing on the wire, and the adapter's URL rule admits only `https://` roots (its AC22).
Its off-origin allowlist (`hosts`, the resolved allowlist decision there, was Q3) must name the
host the upstream's `config.json` sends downloads to, because a `dl` host is a location the
handler took out of upstream metadata: for crates.io that is `static.crates.io` with role
`none`, plus `crates.io` with role `none` when the `dl` template is the `api` download path
that redirects to it. A `dl` host the allowlist does not name makes no connection; the adapter
returns `HostNotAllowedError` and the handler answers the download `502` with an `errors[].detail`
naming the host (the Composer rendering that spec's AC7 cites), never a redirect to the host.
A private sparse upstream that wants cargo's bare-token `Authorization` is configured with the
`header` credential kind (header `Authorization`, the token as the value), presented to the root
and to any allowlist entry given role `root`, and to no other host (its AC6). crates.io is not a
preconfigured profile (the resolved preconfigured-upstream decision below), so this binding is
the operator's recipe until the revisit that decision names. How the sparse-only rule of the
resolved git-protocol decision is enforced under this URL rule is the resolved sparse-enforcement
decision below (was Q7).

**Cross-registry dependencies are a client-side routing directive, not a cache decision.** An
index line's `registry` field names the index URL a dependency comes from; the client resolves
that dependency from **its own** configured source for that URL, not from the registry that
served the line. A private crate on a proxied private upstream that depends on crates.io crates
therefore sends the client to crates.io directly, past this registry, unless the client
source-replaces `crates-io` with this registry's crates.io remote repository, which cargo
supports and which keeps lockfile identity unchanged. The registry cannot rewrite those URLs
without changing lockfile identity, so the recipe is documentation plus a conformance case, not
a transform. The same field is why a `virtual` repository cannot fold a crates.io dependency
into a local member: only source replacement can.

Upstream removal maps onto the settled purge-or-flag table as Cargo's side of that contract: the
handler classifies each observed event into one of `proxy-cache.md`'s event classes ("Upstream
removal or replacement", which names Cargo in the rows below) and the layer executes the
response:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A version's `yanked` flag flips to true | **Flag mirroring**: keep the cached `.crate`, mirror the flag, and record an operator-visible divergence, the same class as the PyPI-yank row of `proxy-cache.md` AC13, because Cargo yank means "not for new resolutions, existing lockfiles keep working" (the Cargo book, and captured). New resolutions then exclude the version because the client refuses yanked versions; that exclusion is the client's half, and ours is serving the flag faithfully |
| The index file answers 404 or 410 where it previously existed, or a version's line vanishes | **Removal with no signal**: keep serving, record an operator-visible divergence and alert once. crates.io lets owners delete young, undownloaded crates and its admins delete others, and neither case is distinguishable on the wire from the other; a deletion with no signal falls through to keep-and-flag by the settled rule |
| The index file answers 451 | The **explicit security signal**: a legal takedown is an unambiguous, deliberate removal by the upstream operator; purge the cached content, one refusal record, one alert |
| A version's `cksum` changes | A **coordinate-bound immutability violation**, treated as the explicit signal: purge the cached `.crate` for that version and alert, the next request re-fetching and verifying against the new digest. The Cargo book says index objects are never modified except `yanked`, cargo verifies every download against the index's `cksum`, and a registry that keeps serving the old bytes under a line advertising the new digest makes every client download fail with a checksum error against us |
| An upstream index file older than the adopted one (a lagging or rolled-back upstream) | **Regression not adopted**: the cached revision stands and a divergence is recorded (`proxy-cache.md` AC22) |
| Any other field change (`rust_version`, `features`, a new line appended) | An **ordinary metadata change**, propagated at the next revalidation |

Detection happens at revalidation, passively, per the resolved security-signal detection
decision in `proxy-cache.md` (was Q12); the active channel is the policy engine's advisory feed,
under the shared security-signal rule, whose OSV malware advisories (RustSec among OSV's
ecosystems) condemn a coordinate in every remote repository of this format.
Cargo has no holding-package convention and no advisory field in the index,
so the 451 and `cksum` rows are the only explicit signals this wire can carry; anything else a
security removal looks like is the keep-and-flag backstop plus the policy engine's advisory
feed.

One assertion trap, inherited from npm and PyPI and sharper here: cargo keeps an index cache
keyed by `ETag` and a downloaded-crate cache under `CARGO_HOME`, so a second `cargo fetch`
sends only `If-None-Match` refreshes and downloads nothing (captured: three 304s and no
download). A second-install case that proves the registry served from cache must therefore
start from a fresh `CARGO_HOME/registry` (captured: with it removed, the downloads reached the
stub again), and assert both directions: the client reached this registry, and this registry
did not contact the upstream, at the network layer.

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available`, `Virtual: supported` and `Rename: supported` (`format-handler-interface.md` AC13).
Virtual aggregation is possible here because nothing on this wire is signed with or names the
repository: a virtual Cargo repository serves its own `config.json`, and renders a crate's index
file, through `ServeRendered`'s lazy form with the virtual's own pointer and each member's
record as the freshness source, from the first member in member order whose head (for a remote
member, its cached index) holds any version under the request path's **exact lowercase
spelling**, omitting later members' versions of it, the dependency-confusion-closing rule every
format spec adopts. The unit is the spelling, not the folded key: folding would let a local
member's `foo_bar` hide a public `foo-bar` behind a `404` while gaining nothing against
dependency confusion, which is a same-name attack (`rubygems.md`'s recheck amended its virtual
rule the same way); the publish-time collision rule stays per repository. A remote member that
has never cached the name is fetched through the layer on that read (`proxy-cache.md` AC26).
Downloads resolve through the member that supplied the line, and the `registry` field stays a
client-side routing directive exactly as above, so a virtual cannot fold a crates.io dependency
into a local member either (only source replacement can). Search on a virtual lists each name
once, from the member that would serve its index file. `cargo publish` against a remote or a
virtual is a wire publish outside the operation vocabulary, refused `405` with the `errors`
body and nothing written, the central refusal rendered in this wire's shape
(`management-api.md`'s was-Q16; AC19). A rename changes no stored
byte: `config.json`'s `dl` and `api` derive from the base URL at request time, index lines carry
no registry name, and every grant, retirement and snapshot resolves to the repository by
identity (`repository-lifecycle.md` AC12); the old name answers exactly what a never-existing
repository answers. The cost is the ecosystem's, stated for operators: the index URL is lockfile
identity (the resolved git-protocol decision), so a renamed repository is a new source to every
`Cargo.lock` that named the old one, and `repository-lifecycle.md`'s resolved alias decision
(was Q2 there) provides no redirect. `repository-lifecycle.md` AC12 requires
`conformance/cargo/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC20 carries it with a real `cargo fetch` from the renamed
repository.

### Conformance, the two clients and the corpus

Two pinned clients straddle the meaningful watershed. `cargo 1.70.0` speaks sparse by default
but cannot authenticate to an index (pre-1.74), lacks `cargo info`, and sends `Content-Type:
application/json` even on `GET` and `DELETE` API requests; `cargo 1.98.1` does the 401 dance,
checks the index before publishing, and drops the header. Every hosted case with anonymous read
runs on both; the private-repository cases run on 1.98.1 and assert the documented hard failure
on 1.70.0 as a negative case, so the version floor is proven rather than believed.

The recorded surface for the replay corpus, named now because a thin recording script yields a
thin specification: `config.json` fetch, a cold `cargo fetch` of a crate with a dependency, the
warm refresh (304s), a `cargo publish` including the post-publish poll, a duplicate publish
refused on each client generation, `cargo yank` then a fresh resolution and a lockfile
download, `cargo yank --undo`, `cargo owner --list`, `cargo search`, `cargo add` of a
mixed-case name and of a separator permutation, a missing crate, and the 401 challenge with a
subsequent authenticated fetch. Recording gates on the harness's redaction criterion
(`conformance-harness.md` AC13), the bare-token `Authorization` value being exactly the kind of
header an allowlist must name to redact. Every deliberate divergence from crates.io (the owners
refusals and the `push` the listing needs, the search limitation on private repositories, the
451 purge) goes on the recorded exception list before its flow is expected to replay.

The corpus is recorded in halves against different references, which
`conformance-harness.md`'s authoritative-reference exception list (its AC28) must name before
the manifest can pass: the **read half** (`config.json`, index files, downloads, the
conditional refreshes, the missing crate, `cargo search`, `cargo add`) against crates.io
itself; the **write half** (`cargo publish` with its poll, the duplicate refusal on each
client, `cargo yank` and `--undo`, `cargo owner --list`) against the canonical implementation
run locally, `rust-lang/crates.io` at a pinned commit in a container with its database, because
crates.io accepts no test publication and a yank there is permanent; and the **private-read
half** (the `401` challenge, the token retry, `auth-required` on index and download requests)
against no reference at all, since crates.io has no private mode and no reference
implementation of `auth-required` exists, so that half is grounded in the Cargo book's protocol
and the captured client reaction alone. The write and private-read rows are a queued
consequence for that spec; AC16 names the halves.

## Acceptance Criteria

- [ ] AC1: `cargo fetch` resolves and downloads a crate and its dependency from a hosted
      repository configured as a `sparse+` format-first URL, for both pinned clients (1.70.0 and
      1.98.1), with the downloaded `.crate` bytes matching the index's `cksum`; an index request
      without the `cargo-protocol: version=1` header (a plain `curl`) receives the same file;
      and a `HEAD` on the index file and on a download answers the `GET`'s status and headers,
      `Content-Length` and `ETag` included, with no body.
- [ ] AC2: `cargo publish` uploads a crate and completes its post-publish poll without a timeout
      on both pinned clients, and a subsequent `cargo fetch` from a fresh client cache downloads
      exactly the published bytes; the index file served for the head snapshot carries the new
      line before the publish response is sent.
- [ ] AC3: A republish of an existing version is refused with the reason in `errors[].detail`
      and leaves no new snapshot, proven on 1.70.0 (which sends the `PUT`) and on 1.98.1 (which
      refuses after its index check), and the refusal message reaches the user on both.
- [ ] AC4: `cargo yank` through the real client flips `yanked` in the served index and produces
      exactly one snapshot: a fresh resolution then excludes the version and an existing
      lockfile still downloads it from this registry, `cargo yank --undo` restores it with one
      further snapshot, the `.crate` file is never removed by either, and with every version
      yanked the index file still serves while `cargo install` (both clients) refuses to
      install the crate, naming the yank only for an exact `--version` (cargo's
      `select_dep_pkg` reports a yank only for an exact requirement and "could not find"
      otherwise), and `cargo info` (1.98.1) refuses it as yanked, the corpus fixing the wording
      of both messages.
- [ ] AC5: A crate published as `ZzBar` is served at the lowercase index path with `name` spelled
      `ZzBar`, `cargo add zzbar` resolves to it and a hand-written dependency `ZzBar` installs,
      an index request for a hyphen/underscore permutation of an existing name answers 404, and
      a publish whose name collides with an existing crate under case folding or under
      hyphen/underscore folding is refused with the reason in `errors[].detail`.
- [ ] AC6: On a private repository, a credential-less `config.json` request answers 401 with a
      `WWW-Authenticate: Cargo login_url` challenge naming `{server.public_url}/ui/tokens`,
      byte-identical for a private and a non-existent repository; 1.98.1 then presents the bare token, receives
      `auth-required: true`, and sends the token on every index and download request, asserted
      from the transcript; a valid token lacking `pull` receives 404; a rejected token receives
      401 and is never served as anonymous; and 1.70.0 fails with its documented error at the
      first 401 without retrying.
- [ ] AC7: On a repository with anonymous read enabled, `config.json` omits `auth-required`,
      both clients fetch and download without a token, and publish, yank and owners still
      require the token, proven by the same requests without one being refused.
- [ ] AC8: `cargo search` returns published crates with `max_version` and `meta.total` on an
      anonymously readable repository, and on a private repository the credential-less search
      request is refused rather than disclosing any crate name, asserted from the transcript.
- [ ] AC9: `cargo owner --list` under a token holding `push` on the crate shows the principals
      recorded as publishers of the crate, each `id` an integer the client decodes, while the
      same command under a token holding only `pull` is answered `404` (the existence rule);
      `cargo owner --add` and `--remove` under `push` are refused with an `errors[].detail`
      naming repository grants as the mechanism, with no state change, and under `pull` alone
      receive the same `404`.
- [ ] AC10: The proxied path fetches a crate from a sparse upstream stand-in and, from a fresh
      `CARGO_HOME`, a second `cargo fetch` reaches this registry and the upstream receives no
      request, both asserted at the network layer; the served `config.json` names this
      registry's `dl` and `api`, and the `.crate` bytes were verified against the index `cksum`
      before being committed.
- [ ] AC11: A proxied index file is revalidated after its TTL and not before, using the
      upstream's `ETag` so an unchanged file costs a 304 upstream; a version published upstream
      becomes visible to `cargo fetch` after the TTL and, absent an explicit refresh, not before;
      a client's own `If-None-Match` refresh inside the TTL is answered 304 without an
      upstream request; and every adopted revision is served under a cache-scoped
      `Last-Modified` later than the previous one, never the upstream's (`proxy-cache.md` AC22);
      the TTL is shortened through the repository's own override (that spec's resolved
      metadata-TTL decision, was Q2) and waited through on the real clock, since no case moves
      an instance's clock (`conformance-harness.md` AC30).
- [ ] AC12: An upstream `yanked` flip is mirrored at the next revalidation with the cached file
      kept and a divergence recorded, a 404 or 410 on a previously served crate keeps serving
      with a divergence recorded, a 451 purges the cached content and raises the operator alert,
      and a changed `cksum` purges that version's cached file, raises the alert, and the next
      download re-fetches and verifies against the new digest, and an upstream index file older
      than the adopted revision is not adopted and records a divergence: Cargo's side of the
      settled removal table in `proxy-cache.md` (its AC13 and AC22).
- [ ] AC13: A publish whose features use `dep:` or weak-dependency syntax is served with those
      entries in `features2` and `v: 2`, a dependency renamed in the manifest is served with
      the rename as the line's `name` and the original crate as its `package` (the swap between
      the publish and index schemas) and the real client resolves the original crate under the
      renamed key, and `links`, `rust_version` and `pubtime` appear in the line; every line
      other than its `yanked` field is byte-identical across every later snapshot, and the
      crate installs through the real client.
- [ ] AC14: A consumer whose `.cargo/config.toml` source-replaces `crates-io` with this
      registry's crates.io remote repository resolves a private crate whose dependencies are
      crates.io crates entirely through this registry, with the upstream stand-in contacted only
      on the first fetch, asserted at the network layer; and an index line whose `registry`
      names a foreign index is served with that value intact.
- [ ] AC15: Configuring a remote repository whose upstream URL is not an `https://` root (a
      `sparse+https://`, `git://`, `ssh://` or `file://` URL) is refused at configuration with
      `upstream-invalid` naming the rule (`upstream-adapters.md` AC23); a remote whose `https://`
      root serves no sparse `config.json` (a git smart-HTTP index URL) answers the client's first
      request `502` with an `errors[].detail` naming the sparse requirement, contacts the
      upstream for nothing but that `config.json` and never speaks git to it; and no hosted
      route under the format mount answers a git smart-HTTP request.
- [ ] AC16: Replay-match passes against a corpus covering the recorded surface named in
      Design, its read half recorded from crates.io, its write half from the pinned local
      `rust-lang/crates.io` reference and its private-read half from no reference, each half
      named in the corpus manifest and the two local-or-none halves listed in
      `conformance-harness.md`'s authoritative-reference exception list (its AC28).
- [ ] AC17: A token holding an unpatterned `pull` beside `push` and `delete` under the pattern
      `acme-*/**` publishes, yanks and unyanks `Acme_Tool` through the real 1.98.1 client and is
      refused publishing or yanking `other-tool`, with no snapshot created by a refusal; a token
      holding only `pull` under the same pattern reads `config.json` (a descriptor), and a real
      `cargo fetch` under it completes for a crate depending only on in-pattern crates, in the
      hosted and the proxied mode, while its direct request for `other-tool`'s index file is
      refused in both modes; and `config.json`'s body carries none of the
      sentinel crate name, version or `cksum` a seeded sentinel crate holds (the descriptor
      sentinel check of `format-handler-interface.md` AC12).
- [ ] AC18: An index-file or download request the shared policy layer refuses answers `403` with
      an `errors[].detail` naming the policy, on the hosted and the proxied path, and a real
      `cargo fetch` of the refused version exits non-zero with that text in its output.
- [ ] AC19: A yank and an unyank driven through the registry-owned management endpoint
      (`POST /api/v1/repositories/{name}/operations`, kinds `withdraw` and `restore`, target
      `{crate}/{version}`) produce the same served index line, exactly one snapshot each, and
      the same authorization outcome as the same operation driven through `cargo yank` and
      `cargo yank --undo`; a principal holding `push` without `delete` is refused through both
      entry points with no snapshot created; neither kind writes a `Retirement` record; and a
      yank against a proxied or a virtual repository answers `405` with problem type
      `repository-type` through both entry points and creates nothing; and `cargo publish`
      against a proxied or a virtual repository is refused `405` with an `errors` body the
      client prints and nothing written.
- [ ] AC20: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      availability `available`, `Virtual: supported` and `Rename: supported`; a real
      `cargo fetch` from a renamed repository succeeds under the new name in both modes, its
      `config.json` naming the new name's `dl` and `api`, while the old name answers exactly
      what a never-existing repository answers; and a virtual repository of two local members
      that both hold a crate under one exact lowercase spelling serves that crate's index file
      from the first member only, `cargo fetch` downloading the first member's bytes, while a
      first member holding `foo_bar` leaves a second member's `foo-bar` served, and a virtual
      over a never-fetched remote member resolves a name on its first read.
- [ ] AC21: A proxied download whose `dl` host (crates.io's `static.crates.io` shape) is on the
      upstream's allowlist with role `none` succeeds with no upstream credential reaching that
      host, asserted at the network layer, while the root host receives the `header`
      credential; the same download with the host
      removed from the allowlist makes no connection to it and answers `502` with an
      `errors[].detail` naming the host; and no response to the client carries the upstream's
      redirect `Location`.
- [ ] AC22: A crate published as `Acme_Tool` is stored under the folded key `acme-tool` and
      reported with the package-level advisory key `Acme_Tool`, on the hosted path and when
      proxied from a stand-in's index line; an advisory naming `Acme_Tool` condemns its version
      at resolution and at a feed sync with no request in flight, one naming `acme-tool` does
      not, and a proxied miss for a condemned version is refused before any upstream request.
- [ ] AC23: A publish whose metadata length prefix exceeds the handler's `Scope(r)` bound is
      denied as an unauthorized caller is, with no byte of the crate spooled; one whose
      declared `Content-Length` or crate length prefix exceeds `management.publish_spool_limit`
      is refused `413` with an `errors` body the client prints and nothing spooled, and one
      that outgrows the bound undeclared is cut and refused with nothing kept, through the spool
      `Deps` hands the handler and never by reading the key; a publish one byte under the bound
      succeeds; and every publish declares `{crate}/{version}` as its claim on its write
      transaction.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/cargo/hosted_test.go` (both pinned clients; `cksum` asserted from the transcript; `curl -I` on an index file and a download, the `HEAD` answer compared header by header with the `GET`'s; the door's half is `signing-service.md` AC32's `internal/index/serve_rendered_test.go`) |
| AC2 | conformance | `conformance/cargo/publish_test.go` (poll completion from the transcript; fresh `CARGO_HOME` before the fetch) |
| AC3 | conformance + integration | `conformance/cargo/publish_test.go` (duplicate case per client generation); `internal/format/cargo/publish_test.go` (snapshot-table assertion) |
| AC4 | conformance + integration | `conformance/cargo/yank_test.go` (fresh resolution, lockfile download, undo); `internal/format/cargo/yank_test.go` (one snapshot per yank, file retained) |
| AC5 | conformance + integration | `conformance/cargo/names_test.go` (mixed case, permutations); `internal/format/cargo/names_test.go` (collision refusals under both foldings) |
| AC6 | conformance | `conformance/cargo/auth_test.go` (private repository; challenge equality across existing and missing repositories asserted from the transcript; 1.70.0 negative case) |
| AC7 | conformance | `conformance/cargo/auth_test.go` (anonymous-read repository, both clients) |
| AC8 | conformance | `conformance/cargo/search_test.go` (readable and private repositories) |
| AC9 | conformance | `conformance/cargo/owners_test.go` (a `push` token and a `pull`-only token through the real client, the listing's integer `id` asserted from the transcript) |
| AC10 | conformance | `conformance/cargo/proxied_test.go` (transcript + network-level assertion, fresh `CARGO_HOME` in setup) |
| AC11 | conformance | `conformance/cargo/proxied_ttl_test.go` (mutating sparse stand-in; the remote created with a seconds-long TTL override and the `script` waiting through it on the real clock; upstream 304 and client 304 both asserted; served `Last-Modified` strictly increasing across adopted revisions, the cache-scoped half being `proxy-cache.md` AC22's `internal/proxy/freshness_test.go`) |
| AC12 | integration | `internal/format/cargo/removal_test.go` (stand-in presenting each event class, including an older index file after a newer one; the shared-layer half is `proxy-cache.md` AC13's and AC22's) |
| AC13 | conformance + integration | `conformance/cargo/index_fidelity_test.go` (install of a `dep:`-featured crate); `internal/format/cargo/index_render_test.go` (line stability across snapshots) |
| AC14 | conformance | `conformance/cargo/source_replacement_test.go` (network-level assertion) |
| AC15 | integration | `internal/format/cargo/upstream_config_test.go` (the configuration refusals through `management-api.md`'s remote create; a git-shaped `https://` stand-in whose `config.json` is absent, with its request log asserting nothing but that path was requested) |
| AC16 | conformance | `conformance/cargo/replay_test.go` (three halves, each with its reference in the corpus manifest; the write and private-read rows checked by `conformance-harness.md` AC28's `conformance/record/reference_exceptions_test.go`) |
| AC17 | conformance + unit | `conformance/cargo/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; pattern-scoped tokens provisioned through the `credentials` key; a real `cargo fetch` under the patterned-only `pull` token in both modes, and `curl` for its refused out-of-pattern index request; shared with `auth.md` AC32); `internal/format/cargo/scope_object_test.go` (the object table, per route, including folding of every spelling and the descriptor sentinel check on `config.json` through the shared helper in `internal/format/scope_test.go`, `format-handler-interface.md` AC12) |
| AC18 | conformance | `conformance/cargo/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`) |
| AC19 | conformance + integration | `conformance/cargo/manage_binding_test.go` (twin crates in one `script`: one yanked through the management endpoint, one through real `cargo yank`; served index lines compared; this is the `script`-driven case `management-api.md` AC24 requires for `withdraw` and `restore`, its presence enforced by `conformance-harness.md` AC26); `internal/format/cargo/manage_binding_test.go` (snapshot count per entry point, `push`-only refusal, no `Retirement` row, `405` `repository-type` on a remote and a virtual; the cross-handler binding table test is `management-api.md` AC8's) |
| AC20 | unit + conformance | `internal/format/cargo/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/cargo/rename_test.go` (`repository-lifecycle.md` AC12, presence enforced by `conformance-harness.md` AC26; `config.json` under the new name); `conformance/cargo/virtual_test.go` (exact-spelling first-member resolution through real `cargo fetch`, the two-spelling case, a never-fetched remote member resolved on first read) |
| AC21 | integration + conformance | `internal/format/cargo/upstream_hosts_test.go` (allowlisted and removed `dl` host, `502` naming the host, no `Location` in any client response; the adapter halves are `upstream-adapters.md` AC6, AC7 and AC8); `conformance/cargo/proxied_test.go` (a crates.io-shaped stand-in whose `dl` sits on a second hostname declared as a `hosts` stand-in of the `upstreams` entry, `conformance-harness.md` AC23) |
| AC22 | unit + integration + conformance | `internal/format/cargo/advisory_key_test.go` (the registered spelling reported on both paths and on the fetch-and-cache request; shared with `supply-chain-policy.md` AC24's `internal/policy/advisory_key_test.go` for the match at resolution and at a feed sync); `conformance/cargo/policy_test.go` (a condemned `Acme_Tool` refused through the real client, the `advisories` key naming the registered spelling) |
| AC23 | integration + conformance | `internal/format/cargo/publish_spool_test.go` (the `Scope(r)` bound, the three spooling outcomes and the one-byte-under case on `management-api.md` AC36's fixture shape, the declared claim read back from the transaction; architecture assertion that the package never reads `management.publish_spool_limit`); `conformance/cargo/publish_test.go` (an over-bound publish through the real client printing the `detail`) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility, `credentials`
(patterned tokens included), an `upstreams` stand-in with a `hosts` stand-in for the download
host (AC21), `state` for pre-yanked and pre-published versions, and `policies` and
`advisories` for AC18. The issued credential reaches the client as
`CARGO_REGISTRIES_<NAME>_TOKEN`, which the `cargo:token` provider reads. The runner-enforced
obligations, both modes and the unauthenticated, unauthorized and pattern-refusal cases in
each, a `script`-driven case per declared management kind and `rename_test.go`, apply from the
sibling specs and the harness's case-set validator (`conformance-harness.md` AC26) and are not
restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads
- `config.json` from visibility and base URL, index rendering from the head snapshot through
  `ServeRendered`'s lazy form (the door-derived `ETag`, 304 and `HEAD`), downloads through
  `ServeFile` over the CAS, name folding and the 404 rule for wrong spellings, the
  repository-independent challenge and the scope mapping with `config.json` as a descriptor
  and its sentinel check; `Capabilities()` with the rename and the exact-spelling virtual cases
  (AC20)

### Phase 2: The web API
- Publish with the binary body read through the bounded spool and the bounded `Scope(r)`
  read, its claim on the write transaction, feature splitting and the dependency-rename swap,
  collision and duplicate refusals, the write-boundary declaration exercised end to end, the
  registered spelling reported as the advisory key (AC22, AC23); owners listing and refusals
  under `push`; search; the per-route addressed-object declaration and the `403` policy
  rendering
- The `Operator` interface declaring `withdraw` and `restore`, with cargo's yank and unyank
  routes as its `Bindings()`, waiting on `docs/internal/plans/foundation/management-api.md`
  reaching `planned` (AC4, AC19)

### Phase 3: Proxied path
- `config.json` rewriting and upstream download-URL composition from the `dl` template,
  conditional revalidation against the upstream `ETag` with the cached index file served
  through `ServeDocument` under a retained count of zero, negative caching, the removal table
  with the `cksum`, 451 and regression rows, the advisory key on the fetch-and-cache request,
  the source-replacement recipe, the upstream binding with the download host on the allowlist
  (AC15, AC21)

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate), replay-match,
  the second pinned client, the matrix rows for the version floor and the search limitation

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The five questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible
by the owner at any time. `grep -rn "standing delegation"` is the owner's review queue. A sixth,
whether yank binds onto the registry-owned management operation, was raised and adopted the same
way by the 2026-09-26 cross-spec reconciliation, which also recorded that the `proxy-cache.md`
revision Q4 looked to has happened and confirmed its answer. A seventh, where the sparse-only
rule is enforced now that `upstream-adapters.md` admits only `https://` roots, was raised and
adopted the same way by the 2026-09-28 reconciliation with the foundation wave, on Opus; the
Fable recheck of 2026-10-08 confirmed it and amended the folds of Q2 (the owners routes under
`push`, the refusal after authorization) and Q5 (a repository-independent `login_url`), each
recorded in its own entry below.

### Resolved: enforcing sparse-only under the adapter's URL rule (was Q7, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: the upstream is
configured as an `https://` root, the Cargo client's `sparse+` URL without its prefix; anything
the `https` adapter's URL rule refuses (`sparse+https://`, `git://`, `ssh://`, `file://`) is
refused at configuration with `upstream-invalid`; and an `https://` root that serves no sparse
`config.json` fails at the first request with a `502` naming the sparse requirement, the handler
never speaking git to it. Folded through Design ("The upstream binding, as `upstream-adapters.md`
shapes it"), AC15 and its Test Plan row, Phase 3, and the git-protocol record's accepted cost.

The question: this spec's AC15 required a remote whose upstream URL *lacks* the `sparse+`
prefix to be refused at configuration. `upstream-adapters.md` has since fixed the `Upstream`
row's URL as an `https://` root (its AC22), with validation per adapter and not per format (its
`Validator`, which `management-api.md` calls on remote create and `PATCH`, its AC23), so the
prefix AC15 demanded is now the thing the adapter refuses. And a git index served over
`https://` is syntactically identical to a sparse root, so no configuration-time check can tell
them apart without a request to the upstream, which `management-api.md` declines at creation
("an unreachable but well-formed upstream is accepted").

**Recommendation (adopted):** A, because it keeps one URL rule for every format, needs no
handler hook the pinned interface lacks, and still guarantees the property the git-protocol
decision cares about: no git client in the egress path and a refusal that names the sparse
requirement instead of a confusing parse error.

| Option | You get | It costs |
|---|---|---|
| **A. `https://` root at configuration; sparse checked at the first fetch of `config.json`** | One URL rule across formats; no new interface; the sparse requirement named to the operator on the first use | A git index URL is accepted at configuration and fails at first use rather than at creation |
| **B. A handler-side upstream validation hook that probes `config.json` at configuration** | The refusal at creation, as AC15 first said | A new optional interface for the re-open, and a network request inside the creation transaction, which `management-api.md` declined for every format |
| **C. Store the `sparse+` URL and strip the prefix in the handler** | Operators paste the URL cargo uses | A second URL grammar on `Upstream`, contradicting `upstream-adapters.md` AC22 and every other format's row |

**Why this is yours:** it trades an earlier failure for one uniform configuration rule, which
is an operator-experience call.

Accepted cost: a mistyped git index URL is caught at the first client request, not at creation;
the operator docs must show the root without `sparse+`. B lost because it adds an interface and
a creation-time probe for one format's convenience; C lost because it forks the upstream URL
grammar the adapter spec settled.

Rechecked on Fable 2026-10-08: confirmed. The options were framed fairly: B is the
creation-time probe `management-api.md` declined for every format, and C forks a URL grammar
`upstream-adapters.md` AC22 fixed. Two things the record under-stated. First, the first-fetch
check is the right discriminator and not merely the available one: a git index served from a
static `https://` root (`raw.githubusercontent.com/.../crates.io-index/master/`) carries a
`config.json` and the per-crate files at the sparse paths, so it **is** a sparse index and
must be accepted, which only a check on the fetched `config.json` gets right. Second, the
failure must render as the `502` AC15 names and not as the layer's negative entry: a
`config.json` the upstream answers `404` or with a non-JSON body is a remote the handler
cannot compose a download URL for, so the handler answers `502` naming the sparse requirement
on every request until the operator fixes the row, while the negative entry only spares the
upstream a repeated fetch inside its TTL.

### Resolved: yank as a binding onto the registry-owned operation (was Q6, raised and adopted 2026-09-26)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: cargo's yank and unyank
routes are served as bindings onto the yank operation of the registry-owned management API,
`docs/internal/plans/foundation/management-api.md`, authorized by `delete` like every yank, with
one implementation behind both entry points. Folded through Context, the blocking
preconditions, Scope, the `Scope(r)` mapping, the write-boundary declaration, Design ("Yank is a
binding onto the registry-owned operation"), AC19 and Phase 2. That spec now exists and
confirms the answer: the operation is its `withdraw` and `restore` kinds, both under `delete`
(its resolved withdraw-action decision, was Q1, whose option B named this record as what it
would undo), with Cargo's row and bindings in its reconciliation table and its AC9 asserting
the `push`-only refusal.

The judgment call it settles: this spec was authored in the same pass that adopted the
cross-format management precedent, and it kept yank as a Cargo route authorized by `push`, on
crates.io's model where an owner who publishes may also yank. The precedent adopted beside it
says the opposite on both counts: management operations are the registry's, never a format's,
with client-driven routes served as bindings (npm's case, which Cargo's is); and PyPI's yank,
the same operation, requires `delete`. Left as written, one operation would carry two
authorization rules depending on which format's client asked.

**Recommendation (adopted):** A, because the precedent exists precisely so that the question is
not answered once per format, and because an operation's authorization cannot sensibly depend on
the wire it arrived over.

| Option | You get | It costs |
|---|---|---|
| **A. A binding onto the shared yank operation, authorized by `delete`** | One yank, one rule, one write path across PyPI and Cargo; the real client still oracles the trigger | A CI credential that publishes cannot also yank without `delete`, which is more than crates.io asks of an owner; the yank half of Phase 2 waits on `management-api.md` |
| **B. A Cargo-local yank route authorized by `push`, as authored** | crates.io's permission model unchanged; no dependency on an unwritten spec | Two implementations of yank and two authorization rules for one operation, the format-by-format answer the precedent was adopted to prevent |
| **C. A binding onto the shared operation, but authorized by `push` for Cargo only** | The shared implementation with crates.io's permission model | The operation's authorization then depends on the entry point, which the central authorizer cannot express without per-format policy, and a `push` token could yank a PyPI release through the shared endpoint if the rule were widened instead |

**Why this is yours:** it decides whether an ecosystem's permission habit or the registry's
single authorization rule governs an operation both share.

Accepted cost: publishers need `delete` to yank, stated here and in the Design section; and the
yank half of Phase 2 cannot start before `management-api.md` is `planned`. B lost because it is
the per-format answer the precedent rules out; C lost because an entry-point-dependent rule is
authorization logic a handler would have to carry.

### Resolved: the git index protocol (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: sparse only, hosted and
as an upstream; the git protocol is deliberately unimplemented and a remote repository whose
upstream index URL lacks the `sparse+` prefix is refused at configuration (AC15).

The question: Cargo supports two index protocols, git and sparse, and the Cargo book treats both
as current. A registry could serve both, serve sparse but proxy git-only upstreams, or serve
sparse only.

**Recommendation:** A, because the reasons against git are not effort. The index URL is lockfile
identity and the Cargo book advises one canonical protocol per registry; serving a git index is
a git smart-HTTP server, a different serving stack from the HTTP handler this interface pins;
proxying a git upstream puts a git client in the handler's egress path, the exact
third-party-egress bypass `format-handler-interface.md` AC9 exists to close; and the client has
spoken sparse since 1.68, by default for crates.io since 1.70, which is the pinned floor and
was captured working sparse-only.

| Option | You get | It costs |
|---|---|---|
| **A. Sparse only, hosted and as an upstream; git recorded as deliberately unimplemented** | One serving stack, one protocol in lockfiles, no git client behind the egress boundary | Git-only private upstreams cannot be proxied, and a team still on cargo older than 1.68 cannot read this registry |
| **B. Serve both protocols hosted** | Every client generation reads the registry | A git server inside the handler, two index representations to keep identical, and the dual-protocol lockfile-identity problem the Cargo book warns about |
| **C. Sparse hosted, git upstreams proxied** | Git-only private upstreams become cacheable | A git client in `internal/format/**`, which is the egress bypass class the interface's forbid rule cannot see and the re-open's import allowlist must then carve an exception for |

**Why this is yours:** it decides whether the egress boundary gains a git-shaped exception for
one format's upstreams, and how old a client this registry promises to serve, which is a
product-support floor rather than a measurement.

Accepted cost: the upstream-adapter validation rule and the matrix row that says "sparse only",
and no answer for a git-only private upstream beyond "publish a sparse index". Where that rule
is enforced changed with `upstream-adapters.md`'s `https://`-only URL rule: the resolved
sparse-enforcement decision (was Q7) above.

### Resolved: what the owners endpoints do (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: `GET owners` lists the
principals recorded as publishers in the package-level document; `PUT` and `DELETE` are refused
with an `errors[].detail` naming repository grants as the mechanism (AC9). The divergence from
crates.io is on the recorded exception list.

The question: `cargo owner` is a real client command, so its trigger has an oracle, but crates.io
ownership is per-crate authorization (owners may publish and yank, and may add owners) while
`auth.md` settled that authorization is evaluated centrally and never in a handler, with
per-crate narrowing expressed as a pattern scope over the addressed object (its resolved
pattern-evaluation decision, was Q13).

**Recommendation:** B. It keeps every authorization decision in the central evaluator, gives
`cargo owner --list` a truthful answer, and makes the refusal explain itself instead of 404ing
a command a Rust user expects to exist. Per-crate publish rights already exist as pattern
scopes; what `cargo owner --add` would add is a second, handler-driven write path into grant
state, which is what the refusal declines.

| Option | You get | It costs |
|---|---|---|
| **A. crates.io semantics: a per-crate owner list the handler enforces on publish and yank** | Rust users' mental model, unchanged | Authorization evaluated in a handler, which the constitution forbids and `auth.md` AC18 catches; a second grant vocabulary beside the pattern scopes the central evaluator already holds |
| **B. Listing served from publisher records; mutations refused with the reason** | Central authorization untouched; the client's command answers honestly; per-crate rights stay where `auth.md` put them | `cargo owner --add` fails against this registry, and the listing is informational rather than a grant |
| **C. No owners surface: 404 on all three** | Nothing to explain | `cargo owner --list` fails with a bare not-found, which reads as a broken registry |

**Why this is yours:** it sets what "owner" means on this registry, a product-surface call made
when the human-grant vocabulary was still open in `auth.md` (settled since as its resolved
human-grant decision, was Q16, in the machine vocabulary, which this answer already assumed).

Accepted cost: a divergence on the exception list, and a listing whose entries are publishers
rather than grant holders, which the `msg`-free response cannot explain and the docs must.

Rechecked on Fable 2026-10-08: confirmed, amended in its fold. Two defects in the fold, not the
answer. "Refused before scope evaluation" was unimplementable as written: under
`format-handler-interface.md` AC10 a route is reached only past the authorizer, and a `Scope(r)`
error is answered as the shared denial, never as an `errors[].detail`, so the explanatory body
AC9 promises could only ever be written after authorization. And the listing under `pull`
disclosed publisher identities to every reader of a public repository, the disclosure
`management-api.md`'s was-Q17 withholds from readers who could not originate a write. All three
owners routes are now `push` on `{crate}`: the listing answers principals (with an integer
`id` cargo decodes, derived from the principal identity) only to a caller who may publish
there, the mutations are authorized the same way and then refused with the body, writing
nothing, and a caller holding `pull` alone meets the existence rule's `404` on all three.
Folded through the `Scope(r)` mapping, the object table, the yank section's owners paragraph,
AC9 and its Test Plan row. The accepted cost grows by one line: a `pull`-only CI token cannot
run `cargo owner --list`, recorded on the exception list.

### Resolved: name collisions at publish (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: refuse a new crate whose
name collides with an existing one under case folding or under hyphen/underscore folding (AC5);
lookup folds the same way and answers 404 for a spelling that is not the registered one.

The question: case-insensitive uniqueness is forced by the lowercase index path (two crates
differing only by case would share a file). Separator uniqueness is not forced: `foo-bar` and
`foo_bar` have distinct paths and could coexist, and cargo's own lookup requests both
permutations.

**Recommendation:** A, crates.io's rule, which the Cargo book recommends registries adopt. The
decisive fact is captured: cargo fetches the other separator spelling itself when the first
misses, so two coexisting spellings are confusable inside the client's own lookup, which is a
homograph shape inside a private registry.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse both collision classes** | Matches crates.io; one crate per folded key, so the folded lookup is unambiguous | A team that genuinely wants `foo-bar` and `foo_bar` as different crates cannot have them |
| **B. Refuse case collisions only** | The minimum the format forces; separator pairs coexist | `foo_bar` and `foo-bar` shadow each other in cargo's permutation lookup and in every "similar crate" hint |
| **C. Fold separators on lookup too, serving `foo_bar` from `foo-bar`'s file** | No 404 on the "wrong" spelling | Buys nothing: the resolver rejects a candidate whose `name` differs (captured), and the client already asks for the other spelling |

**Why this is yours:** it is the naming promise operators build on, and refusing a legal
Cargo name is a product rule rather than a protocol one.

Accepted cost: one refusal message more to document, and a folded `Package.name` whose
registered spelling lives in the metadata document rather than the row.

### Resolved: crates.io as a preconfigured upstream (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: crates.io is
user-configured in v1 and not added to the preconfigured set; the trigger for revisiting is the
catalogue's Tier 2 verdict, at which point the precedent to follow is the resolved
preconfigured-upstream decision in `ansible-collections.md` (was its Q4), which adopted adding
galaxy.ansible.com as the fourth upstream through `proxy-cache.md`'s own revision mechanism.

That revision has since been made, and it confirmed this answer: `proxy-cache.md`'s resolved
preconfigured-set extension (was Q14) added galaxy.ansible.com and left crates.io and pub.dev
user-configured until a `continue` breadth-gate verdict authorizes their formats, each then
decided as its own extension. The revisit this record names is that extension. A second
extension (`proxy-cache.md`'s was-Q17, adding api.nuget.org and repo.maven.apache.org) kept the
same line: its AC19 names crates.io as seeded by no fresh installation, and
`upstream-adapters.md`'s profile table lists crates.io as "not preconfigured and not profiled
here", so a Cargo remote is the operator-configured binding Design describes.

The question: `proxy-cache.md` settled npm, PyPI and Docker Hub as the preconfigured,
enabled-by-default upstreams, with the nightly real-upstream job covering exactly that set, and
`ansible-collections.md` has since adopted a fourth. Rust CI caching is a common want.

**Recommendation:** B, for sequencing rather than effort: this format is Tier 2 and is built only
if the breadth gate says so, so amending a sibling's settled decision on its account now would
be a half-applied change against a format that may not be built; and the preconfigured set's
cost is a standing support surface the owner priced for three upstreams.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure crates.io now, amending `proxy-cache.md`'s resolved preconfigured-upstreams decision** | Rust caching works in thirty seconds | A sibling decision reopened from a Tier 2 spec before the gate that decides whether Tier 2 happens; crates.io's rate limits and CDN quirks join the support surface today |
| **B. User-configured in v1, revisited when the Tier 2 verdict is in** | No sibling amendment from a format that may never be built; the adapter validation rule still ships | A worse first-run story for Rust than for npm until the revisit, and no nightly run against the real crates.io |

**Why this is yours:** it amends a decision you made in a sibling and sizes the standing
support surface, a product and sequencing call.

Accepted cost: the proxied conformance cases run against a sparse stand-in only; the real
crates.io is exercised by the recording session and nothing scheduled, until the revisit.

### Resolved: the unauthenticated challenge against the existence rule (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the handler renders a
401 with `WWW-Authenticate: Cargo login_url="<api>/me"` for every credential-less request under
a repository that is not anonymously readable, uniformly whether the repository exists or not,
and 404 for a credentialed principal lacking `pull` (AC6); the mechanism is the one
`formats/oci.md` already uses, the handler rendering the challenge and the shared layer deciding.

The question: cargo only sends its token to an index after a 401 on `config.json`, while
`auth.md` AC17 requires missing and forbidden to be indistinguishable and
`format-handler-interface.md` AC10 requires a `Scope(r)` failure to be denied as an unauthorized
caller is. A 404 on the credential-less `config.json` would never trigger the token; a 401 that
varied with existence would be an oracle.

**Recommendation:** A. It is what OCI already does for its own challenge, so it invents no
second mechanism, and issuing the challenge uniformly is what keeps it from disclosing anything.

| Option | You get | It costs |
|---|---|---|
| **A. Uniform 401 challenge for credential-less requests; 404 for credentialed-but-forbidden** | Cargo's auth dance works; no existence disclosure; the OCI precedent reused | The challenge is issued for repositories that do not exist, so a probe learns only that the mount exists |
| **B. 404 everywhere, per the letter of AC17** | One denial shape | No cargo client ever presents its token to a private index, so private repositories are unusable |
| **C. 401 only for repositories that exist** | The challenge is "honest" | The challenge itself becomes the existence oracle AC17 forbids |

**Why this is yours:** it applies a security rule you settled to a protocol that needs a
specific status to work, and confirms the OCI reading of that rule generalises.

Accepted cost: an `auth.md` client-table row for cargo (bare token, and the challenge form) was
a sibling amendment this spec needed before its auth cases are written; it has landed, as the
`cargo` row of that spec's client table and the scheme-less form of its presentation-forms
table (AC31), with the `login_url` challenge named in its existence rule.

Rechecked on Fable 2026-10-08: confirmed, amended in its fold. The answer stands (the OCI
mechanism, a uniform challenge), but its `login_url="<api>/me"` contradicted AC6's
"byte-identical for a private and a non-existent repository": `{api}` derives from the
repository's own URL, so the two challenges differed by the repository name, and a probe
comparing them against its request learned nothing but the header was not identical. The URL
is now repository-independent, `{server.public_url}/ui/tokens` (`web-ui.md`'s Tokens page,
which is also where a token is actually minted), so identity holds by construction and
`cargo login` prints a URL that works. Folded through "Authentication", AC6, and this record;
`auth.md`'s existence-rule sentence naming the `login_url` form is unchanged in meaning.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 4d1aeb1 | authoring pass: grounded first draft, not a review | Grounded the wire contract three ways: captured traffic from `cargo 1.70.0` and `cargo 1.98.1` run in containers against a logging stub (publish body decoded with its two little-endian lengths, duplicate publish on each client generation, yank, unyank, owners, search, `cargo add`, `cargo fetch`, conditional refreshes, mixed-case and separator-permutation lookups, the 401 challenge and token retry, yank resolution with and without a lockfile, `cargo info` and `cargo install` on a yanked crate); the Cargo book's index, web API, authentication and credential-provider pages plus the cargo source for the sparse client, publish wait, index lookup and `cargo add`; and the live `index.crates.io` (`config.json`, `ETag`/`Last-Modified`/`Cache-Control`, a 304, 404s on missing and wrong-case paths, the immutable download endpoint). Version milestones taken from the Rust release notes (sparse stabilised 1.68, default 1.70, registry-auth 1.74, `cargo info` 1.82, publish wait 1.66). Design built from that: the rendered append-only index file with a snapshot-derived `ETag`, the three-layer name trap with folded key plus registered spelling, the bare-token auth form and the 401 dance with its 1.74 floor, the search-cannot-authenticate limitation, the write-boundary declaration with yank as a metadata-only write, the proxied classification with `config.json` never served verbatim, the cross-registry `registry` field as a client-side routing directive answered by source replacement, Cargo's rows of the removal table (yank mirrored, 404/410 keep-and-flag, 451 and `cksum` change purge), and the fresh-`CARGO_HOME` assertion trap. Five questions written in decision shape and adopted under the standing delegation: sparse only (git deliberately unimplemented, AC15), owners listing-plus-refusal (AC9), both name-collision classes refused (AC5), crates.io not preconfigured in v1, and the uniform 401 challenge reconciled with the existence rule via the OCI precedent (AC6). Sixteen criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here: an `auth.md` client-table row for cargo, a Cargo yank row beside the PyPI one in `proxy-cache.md`'s removal table, and a Cargo row in the management-surfaces analysis. Stays draft; awaits an independent review. |
| 2026-09-26 | da0aecd | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied: charter AC9 beside catalogue AC5 in the breadth-gate precondition; the Cluster 5 precedent folded in: Q6 raised and adopted (yank and unyank as bindings onto `management-api.md`'s yank operation, `delete` as for PyPI, hosted only), through Context, preconditions, Scope, the `Scope(r)` mapping, the write boundary, a new Design section and AC19, resolving from this side the yank-to-push divergence `auth.md` recorded for the management-api author; the addressed-object table over the folded key with version-level objects, `config.json` and search none, publish object from the metadata JSON that precedes the crate bytes, with AC17 and the consequence that patterned-only `pull` cannot run cargo; the policy rendering (AC18); the shared security-signal rule cited; the Q2 record's human-grant wording qualified as resolved; the Q4 record noted as confirmed by `proxy-cache.md`'s resolved Q14. The management-surfaces analysis gained Cargo's rows. Stays draft. |
| 2026-09-28 | 15ced69 | cross-spec reconciliation of the Wave 1 folds on Opus. Not a review | Not a review. Redid the pass the interrupted batch-3 agent left without a record, every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec and of this file; items the partial commit had applied verified as done (the `management-api.md` preconditions, Scope, write-boundary and binding text; the Cargo row of `artifact-verification.md`'s "Nothing" table and `signing-service.md`'s "Nothing, stated"; the `auth.md` `cargo` row and scheme-less form; `config.json` as a descriptor in the object table and the Design prose, Open item 34; `WriteRefusal` and the status-line phrase; `server.public_url`; the removal table in `proxy-cache.md`'s event classes with the regression row; the Capabilities and lifecycle section). Applied now: AC17 inverted to the descriptor reading (patterned-only `pull` runs a real `cargo fetch` in both modes, out-of-pattern index refused, descriptor sentinel check; Test Plan row shared with `auth.md` AC32); AC19 names the operations endpoint, kinds and target, no `Retirement`, `405` `repository-type` on remote and virtual, with `management-api.md` AC8, AC9 and AC24 cited; AC11 and AC12 gain the cache-scoped `Last-Modified` and the regression row (`proxy-cache.md` AC22); new AC20 (Capabilities, rename and virtual through real `cargo fetch`, which the Design section already promised) and AC21 (the `dl` host on the upstream allowlist, `header` credential to the root only, `502` naming an unlisted host, `upstream-adapters.md` AC6-AC8), each with a Test Plan row; the Q6 record cites `management-api.md` as written, the Q4 record its second extension (was Q17) and AC19, the Q5 record the landed `auth.md` row. A mismatch found, not queued: AC15 demanded the `sparse+` prefix that `upstream-adapters.md` AC22 now refuses, and no configuration-time check can tell a git index over `https://` from a sparse one without a request `management-api.md` declines at creation; Q7 raised in decision shape and adopted (A: `https://` root, sparse checked at the first `config.json` fetch), folded through Design, AC15, Phase 3 and the Q1 record; `fable_recheck` added. Stays draft. |
| 2026-10-08 | dc98bf7 | Fable recheck: full review (claim verification at HEAD against every cited sibling, the Cargo book's index and web-API schemas and the live `index.crates.io`; the adversarial lens at full strength on the Opus reconciliation and on the Fable-authored design, the sparse index, `config.json`, the line format and its append semantics, the publish framing, yank, owners, the two pinned clients and the all-yanked `cargo install`; constitution compliance) + re-examination of the Opus adoption | Q7 (sparse enforcement at the first `config.json` fetch): **confirmed**, its record extended with why the check is the right discriminator (a git index behind a static `https://` root is a sparse index and must pass) and why the failure is a `502` and never the layer's negative entry. Q2 (owners): **amended in fold**, a pre-authorization refusal carrying a body being unimplementable under `format-handler-interface.md` AC10 and the `pull` listing disclosing publishers against `management-api.md`'s was-Q17; all three routes are `push` on `{crate}`, refused or answered after authorization (AC9). Q5 (the challenge): **amended in fold**, `login_url` made repository-independent (`{server.public_url}/ui/tokens`) because a per-repository `{api}/me` could never be byte-identical as AC6 required. Refuted against the Cargo book: the dependency-rename mapping was inverted (the index line's `name` is the rename and `package` the original crate, the reverse of the publish JSON; Design and AC13 fixed). Found: `Package.name` is the folded key, so matching advisories on it would miss every underscore-bearing crate; the registered spelling is reported as the package-level advisory key on both paths and on the fetch-and-cache request (new AC22, `supply-chain-policy.md` was-Q11). The Opus reconciliation verified claim by claim: AC17's descriptor inversion, AC19's operations endpoint, AC20's capabilities and AC21's `dl`-host allowlist stand; AC20's virtual rule amended from the folded key to the exact lowercase spelling (folding let a local `foo_bar` hide a public `foo-bar` for no gain against same-name confusion); AC19 extended with the wire publish refused `405` on a remote or virtual (`management-api.md` was-Q16); AC11 made satisfiable under the harness's no-clock rule through the per-repository TTL override; AC4's `cargo install` clause corrected (the yank is named only for an exact `--version`). Queued consequences applied: the serving door (`signing-service.md` was-Q14 and was-Q24: `ServeRendered`'s lazy form with the snapshot identity, `ServeFile`, `ServeDocument`, `HEAD` on every read route; AC1), the spool bound and the claim declaration (`management-api.md` was-Q14, was-Q15 declined with its reason, was-Q20; new AC23, with the bounded body-reading `Scope(r)` recorded as a re-open input), the remote's zero retained count, never-evicted metadata and anchor class `none` (`proxy-cache.md` was-Q19 to was-Q23), the `global-credential-providers` default corrected, per-registry-name credentials noted. The corpus split into a read half (crates.io), a write half (a pinned local `rust-lang/crates.io`) and a private-read half (no reference), AC16 amended, the two exception rows queued for `conformance-harness.md`. Nine sibling consequences reported. 23 criteria, each with a Test Plan row; no mechanical check-spec failure; `fable_recheck` cleared. draft -> planned. |
