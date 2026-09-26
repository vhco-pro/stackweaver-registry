---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: wire contract captured from cargo 1.70.0 and 1.98.1 against a logging stub, checked against the Cargo book, the cargo source and the live crates.io index. Five questions written and adopted under the owner's standing delegation. Awaits a /spec review pass."
description: "Spec for the Cargo (Rust) registry format: the sparse index protocol and the crates.io-style web API, hosted and proxied, with cargo as the conformance oracle for reads, publish and yank alike."
author: michielvha
goal: "Serve Rust teams a private crate registry and a crates.io cache from one handler, with every management operation cargo itself can drive verified through the real client."
priority: "medium"
issue: ""
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
draws; this spec therefore adds no question to that analysis's cluster, and its yank criteria are
ordinary conformance cases.

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every
Tier 1 and Tier 2 handler (`format-handler-interface.md` AC8). Cargo is Tier 2, so in practice
the catalogue's Tier 1 gate (its AC5) and the charter's breadth re-evaluation (build-order step
8) both precede it; the re-open is recorded here anyway, from this side, because a gate enforced
on one side only is enforced nowhere.

**The breadth gate decides whether this format is built at all.** `formats/catalogue.md` AC5
forbids Tier 2 work until Tier 1 is complete and the continue-or-shrink verdict is in the
experiment log. This spec exists now so the catalogue's AC1 (a spec before any code) holds and
so the format's traps are on record before the gate, not to pull the format forward.

## Scope

**In scope:**

- The sparse index protocol: `config.json`, the sharded per-crate index files, conditional
  requests with `ETag` and 304, and the `sparse+` URL scheme.
- Crate download at the `dl` endpoint, with the `.crate` bytes verified against the index's
  `cksum`.
- The registry web API as cargo drives it: publish with its length-prefixed binary body, yank
  and unyank, the owners endpoints, and search.
- Registry-token authentication in the exact form cargo sends: the bare token as the whole
  `Authorization` header value, the `auth-required` flag, and the `WWW-Authenticate: Cargo`
  challenge that makes cargo present the token on index and download requests.
- Name rules: the lowercase index path, the case-preserved JSON `name`, and refusal of names
  that collide with an existing crate under case folding or hyphen/underscore folding (the
  resolved name-collision decision below).
- The proxied path against a sparse upstream (crates.io or a private sparse registry):
  classification, `config.json` rewriting, conditional revalidation against the upstream's
  `ETag`, negative caching, and Cargo's rows of the upstream-removal table.
- The write-boundary declaration `data-model.md` requires, with yank and unyank as metadata-only
  writes.

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
  primitive is the index `cksum`. There is nothing here for the artifact-verification sibling
  that `supply-chain-policy.md` settled as the producer (its resolved verification-ownership
  decision, was Q6) to verify, and nothing this spec must meet; advisory matching for crates is
  the policy engine's coordinate-level path (OSV carries the RustSec ecosystem) and needs no
  handler cooperation.
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
the pointer names, exactly as npm renders its packument and PyPI its simple index, and the
`ETag` it serves is derived from the package and the snapshot number, so a 304 costs no
rendering and a repoint (promotion or rollback) changes the `ETag` and invalidates every
client's cached copy on its next refresh.

The mapping onto the shared model, using exactly the levels `data-model.md` provides:

- `Package.name` holds the **folded key**: lowercase, with `_` replaced by `-`. The folded key
  is what the collision rule below makes unique, and it is what an index request is resolved
  against after the same folding. The **registered spelling** (`ZzBar`) lives in the
  package-level metadata document and is what every index line's `name` carries, because the
  JSON `name` is case-sensitive to the resolver (captured: a hand-written dependency `zzbar`
  against a crate registered `ZzBar` fails with "packages with similar names: ZzBar", while
  `cargo add zzbar` translates to `ZzBar`, and 1.70.0 prints "translating `zzbar` to `ZzBar`").
- Each `Version` holds the publish metadata as its version-level document: the dependency list
  (with the wire's `version_req` stored as the index's `req`, and `explicit_name_in_toml` as the
  index's `package`), `features`, `links`, `rust_version`, the descriptive fields the web API
  carries, the `yanked` flag, and the publish time that the optional `pubtime` index field
  surfaces (the live crates.io index emits it).
- The `.crate` file is the version's single `File`; its `Blob` is keyed by the CAS sha256, which
  is exactly the value the index advertises as `cksum`. The CAS computes it server-side and the
  index never advertises a digest the store did not verify, the same rule PyPI's spec states;
  the format's checksum and the storage key happen to coincide here, but the key is still the
  CAS's digest of the received bytes, never a value the client supplied.
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
   `Cargo` scheme and only the `login_url` parameter).
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
  `config.json`, index files, downloads and search are `pull`; publish, yank and unyank are
  `push`; the owners mutations are refused before any scope evaluation (below). The addressed
  object the amended pin requires (`format-handler-interface.md`, "The pinned method set") is
  the crate's registered spelling on every index, download, publish, yank and owners route, so
  a pattern scope can narrow a token to one crate; `config.json` and search address the
  repository as a whole and report *none*.
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
  form beside Bearer and Basic, and `auth.md`'s client table has no `cargo` row; the row it
  needs is listed in this spec's sibling consequences and must land there before this format's
  auth cases are written, per that spec's rule that each row is confirmed against captured
  traffic (it now is).
- **Search cannot authenticate, by the client's own contract.** The captures show no
  `Authorization` on search even with a token configured, so on a private repository `cargo
  search` is refused like any other credential-less request. That is honest and unavoidable; a
  registry that answered anonymous search on a private repository would disclose its crate
  names. Search works on anonymously readable repositories, and the limitation is recorded in
  the matrix.

The harness needs nothing new: the case writes the issued token into the client container as
`CARGO_REGISTRIES_<NAME>_TOKEN` (the `cargo:token` provider reads it, and it is the only stable
provider that does), sets `registries.<name>.index` to the `sparse+` URL, and lists
`registry.global-credential-providers = ["cargo:token"]` because the Cargo book says an
authenticated alternative registry requires a provider to be configured. TLS interception for
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
- Owners mutations are refused and write nothing; the owners listing is a read.
- **A republish of an existing version is refused** with the reason in the body and leaves no
  snapshot behind, matching the public registry. The `.crate` at a coordinate is the immutable
  artifact this registry's own proxy layer caches forever, and 1.98.1 refuses the duplicate
  client-side anyway, so accepting it would only ever be observed by old clients and downstream
  caches, silently.
- A proxied repository creates no snapshots at all; index arrival and revalidation are cache
  materialisation.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`:

- **`config.json` is never served verbatim.** It is mutable metadata with a TTL as a cache
  entry, but what clients receive is always this registry's own document: `dl` and `api`
  pointing at this repository's format-first URLs and `auth-required` derived from this
  repository's visibility. The upstream's `dl` template (with every marker the Cargo book
  defines) is what the handler uses to compose upstream download URLs, and it follows the
  upstream's redirects (crates.io's `api` download path answers 302 to `static.crates.io`).
  This is the same format-specific transform `format-handler-interface.md` canonicalises with
  npm's packument URLs, and it likewise needs the externally visible base URL, not the bind
  address. Without it every proxied download goes straight past the cache.
- **Per-crate index files are mutable metadata with a TTL**, revalidated conditionally: the live
  `index.crates.io` serves `ETag` and `Last-Modified` and answered 304 to `If-None-Match`, so an
  unchanged file costs a 304, not a re-download. The cached document is served to clients under
  this registry's own `ETag`, and clients' own `If-None-Match` refreshes are answered 304 from
  the cache without touching the upstream inside the TTL. Index lines pass through unmodified
  except for one field: a `registry` value equal to the upstream's own index URL is normalised
  to null, so that "this registry" keeps meaning the repository the client is talking to.
- **`.crate` files are immutable artifacts**: cached indefinitely (crates.io itself serves them
  `immutable` with a one-year max-age), fetched stream-and-verify against the `cksum` of the
  index line this registry served, never committed on a mismatch or truncation.
- **Missing crates are negatively cached** with the short TTL. The Cargo book lists 404, 410 and
  451 as the "crate does not exist" statuses and the client treats them alike; all three are
  negatively cached, and clients always see 404. A 429 or 5xx is never cached as absence
  (`proxy-cache.md` AC9).
- The `cargo-protocol: version=1` request header is logged, never required: `curl` and other
  tools read sparse indexes too.

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

Upstream removal maps onto the settled purge-or-flag table as Cargo's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A version's `yanked` flag flips to true | **Mirror the flag**, keep the cached `.crate`, and record an operator-visible divergence: the same class as the PyPI-yank row of `proxy-cache.md` AC13, because Cargo yank means "not for new resolutions, existing lockfiles keep working" (the Cargo book, and captured). New resolutions then exclude the version because the client refuses yanked versions; that exclusion is the client's half, and ours is serving the flag faithfully |
| The index file answers 404 or 410 where it previously existed, or a version's line vanishes | Keep serving, record an operator-visible divergence. crates.io lets owners delete young, undownloaded crates and its admins delete others, and neither case is distinguishable on the wire from the other; a deletion with no signal falls through to keep-and-flag by the settled rule |
| The index file answers 451 | The **explicit signal**: a legal takedown is an unambiguous, deliberate removal by the upstream operator; purge the cached content and alert the operator |
| A version's `cksum` changes | An **immutability violation** treated as the explicit signal: purge the cached `.crate` for that version and alert. The Cargo book says index objects are never modified except `yanked`, cargo verifies every download against the index's `cksum`, and a registry that keeps serving the old bytes under a line advertising the new digest makes every client download fail with a checksum error against us |
| Any other field change (`rust_version`, `features`, a new line appended) | An ordinary metadata change, propagated at the next revalidation |

Detection happens at revalidation, passively, per the resolved security-signal detection
decision in `proxy-cache.md` (was Q12); the active channel is the policy engine's advisory feed.
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
refusals, the search limitation on private repositories, the 451 purge) goes on the recorded
exception list before its flow is expected to replay.

## Acceptance Criteria

- [ ] AC1: `cargo fetch` resolves and downloads a crate and its dependency from a hosted
      repository configured as a `sparse+` format-first URL, for both pinned clients (1.70.0 and
      1.98.1), with the downloaded `.crate` bytes matching the index's `cksum`; an index request
      without the `cargo-protocol: version=1` header (a plain `curl`) receives the same file.
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
      yanked the index file still serves while `cargo install` (both clients) and `cargo info`
      (1.98.1) refuse the crate as yanked.
- [ ] AC5: A crate published as `ZzBar` is served at the lowercase index path with `name` spelled
      `ZzBar`, `cargo add zzbar` resolves to it and a hand-written dependency `ZzBar` installs,
      an index request for a hyphen/underscore permutation of an existing name answers 404, and
      a publish whose name collides with an existing crate under case folding or under
      hyphen/underscore folding is refused with the reason in `errors[].detail`.
- [ ] AC6: On a private repository, a credential-less `config.json` request answers 401 with a
      `WWW-Authenticate: Cargo login_url` challenge that is byte-identical for a private and a
      non-existent repository; 1.98.1 then presents the bare token, receives
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
- [ ] AC9: `cargo owner --list` shows the principals recorded as publishers of the crate, and
      `cargo owner --add` and `--remove` are refused with an `errors[].detail` naming
      repository grants as the mechanism, with no state change.
- [ ] AC10: The proxied path fetches a crate from a sparse upstream stand-in and, from a fresh
      `CARGO_HOME`, a second `cargo fetch` reaches this registry and the upstream receives no
      request, both asserted at the network layer; the served `config.json` names this
      registry's `dl` and `api`, and the `.crate` bytes were verified against the index `cksum`
      before being committed.
- [ ] AC11: A proxied index file is revalidated after its TTL and not before, using the
      upstream's `ETag` so an unchanged file costs a 304 upstream; a version published upstream
      becomes visible to `cargo fetch` after the TTL and, absent an explicit refresh, not before;
      and a client's own `If-None-Match` refresh inside the TTL is answered 304 without an
      upstream request.
- [ ] AC12: An upstream `yanked` flip is mirrored at the next revalidation with the cached file
      kept and a divergence recorded, a 404 or 410 on a previously served crate keeps serving
      with a divergence recorded, a 451 purges the cached content and raises the operator alert,
      and a changed `cksum` purges that version's cached file, raises the alert, and the next
      download re-fetches and verifies against the new digest: Cargo's side of the settled
      removal table in `proxy-cache.md` (its AC13).
- [ ] AC13: A publish whose features use `dep:` or weak-dependency syntax is served with those
      entries in `features2` and `v: 2`, a renamed dependency round-trips through the index
      `package` field, and `links`, `rust_version` and `pubtime` appear in the line; every line
      other than its `yanked` field is byte-identical across every later snapshot, and the
      crate installs through the real client.
- [ ] AC14: A consumer whose `.cargo/config.toml` source-replaces `crates-io` with this
      registry's crates.io remote repository resolves a private crate whose dependencies are
      crates.io crates entirely through this registry, with the upstream stand-in contacted only
      on the first fetch, asserted at the network layer; and an index line whose `registry`
      names a foreign index is served with that value intact.
- [ ] AC15: Configuring a remote repository whose upstream index URL lacks the `sparse+` prefix
      is refused at configuration time with a message naming the sparse requirement, and no
      hosted route under the format mount answers a git smart-HTTP request.
- [ ] AC16: Replay-match passes against a corpus recorded from crates.io covering the recorded
      surface named in Design.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/cargo/hosted_test.go` (both pinned clients; `cksum` asserted from the transcript) |
| AC2 | conformance | `conformance/cargo/publish_test.go` (poll completion from the transcript; fresh `CARGO_HOME` before the fetch) |
| AC3 | conformance + integration | `conformance/cargo/publish_test.go` (duplicate case per client generation); `internal/format/cargo/publish_test.go` (snapshot-table assertion) |
| AC4 | conformance + integration | `conformance/cargo/yank_test.go` (fresh resolution, lockfile download, undo); `internal/format/cargo/yank_test.go` (one snapshot per yank, file retained) |
| AC5 | conformance + integration | `conformance/cargo/names_test.go` (mixed case, permutations); `internal/format/cargo/names_test.go` (collision refusals under both foldings) |
| AC6 | conformance | `conformance/cargo/auth_test.go` (private repository; challenge equality across existing and missing repositories asserted from the transcript; 1.70.0 negative case) |
| AC7 | conformance | `conformance/cargo/auth_test.go` (anonymous-read repository, both clients) |
| AC8 | conformance | `conformance/cargo/search_test.go` (readable and private repositories) |
| AC9 | conformance | `conformance/cargo/owners_test.go` |
| AC10 | conformance | `conformance/cargo/proxied_test.go` (transcript + network-level assertion, fresh `CARGO_HOME` in setup) |
| AC11 | conformance | `conformance/cargo/proxied_ttl_test.go` (mutating sparse stand-in; upstream 304 and client 304 both asserted) |
| AC12 | integration | `internal/format/cargo/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC13 | conformance + integration | `conformance/cargo/index_fidelity_test.go` (install of a `dep:`-featured crate); `internal/format/cargo/index_render_test.go` (line stability across snapshots) |
| AC14 | conformance | `conformance/cargo/source_replacement_test.go` (network-level assertion) |
| AC15 | integration | `internal/format/cargo/upstream_config_test.go` |
| AC16 | conformance | `conformance/cargo/replay_test.go` |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility, `credentials`, an
`upstreams` stand-in, and `state` for pre-yanked and pre-published versions. The issued
credential reaches the client as `CARGO_REGISTRIES_<NAME>_TOKEN`, which the `cargo:token`
provider reads. The runner-enforced obligations, both modes and the unauthenticated,
unauthorized and pattern-refusal cases in each, apply from the sibling specs and are not
restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads
- `config.json` from visibility and base URL, index rendering from the head snapshot with the
  snapshot-derived `ETag` and 304, downloads through the CAS, name folding and the 404 rule for
  wrong spellings, the challenge and scope mapping

### Phase 2: The web API
- Publish with the binary body, feature splitting, collision and duplicate refusals, the
  write-boundary declaration exercised end to end; yank and unyank; owners listing and refusals;
  search

### Phase 3: Proxied path
- `config.json` rewriting and upstream download-URL composition from the `dl` template,
  conditional revalidation against the upstream `ETag`, negative caching, the removal table
  with the `cksum` and 451 rows, the source-replacement recipe

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
by the owner at any time. `grep -rn "standing delegation"` is the owner's review queue.

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
and no answer for a git-only private upstream beyond "publish a sparse index".

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

**Why this is yours:** it sets what "owner" means on this registry ahead of the human-grant
vocabulary you have not yet settled in `auth.md`, a product-surface call.

Accepted cost: a divergence on the exception list, and a listing whose entries are publishers
rather than grant holders, which the `msg`-free response cannot explain and the docs must.

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

Accepted cost: an `auth.md` client-table row for cargo (bare token, and the challenge form) is a
sibling amendment recorded in this spec's consequences, since that spec's table must carry the
captured form before the auth cases are written.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 4d1aeb1 | authoring pass: grounded first draft, not a review | Grounded the wire contract three ways: captured traffic from `cargo 1.70.0` and `cargo 1.98.1` run in containers against a logging stub (publish body decoded with its two little-endian lengths, duplicate publish on each client generation, yank, unyank, owners, search, `cargo add`, `cargo fetch`, conditional refreshes, mixed-case and separator-permutation lookups, the 401 challenge and token retry, yank resolution with and without a lockfile, `cargo info` and `cargo install` on a yanked crate); the Cargo book's index, web API, authentication and credential-provider pages plus the cargo source for the sparse client, publish wait, index lookup and `cargo add`; and the live `index.crates.io` (`config.json`, `ETag`/`Last-Modified`/`Cache-Control`, a 304, 404s on missing and wrong-case paths, the immutable download endpoint). Version milestones taken from the Rust release notes (sparse stabilised 1.68, default 1.70, registry-auth 1.74, `cargo info` 1.82, publish wait 1.66). Design built from that: the rendered append-only index file with a snapshot-derived `ETag`, the three-layer name trap with folded key plus registered spelling, the bare-token auth form and the 401 dance with its 1.74 floor, the search-cannot-authenticate limitation, the write-boundary declaration with yank as a metadata-only write, the proxied classification with `config.json` never served verbatim, the cross-registry `registry` field as a client-side routing directive answered by source replacement, Cargo's rows of the removal table (yank mirrored, 404/410 keep-and-flag, 451 and `cksum` change purge), and the fresh-`CARGO_HOME` assertion trap. Five questions written in decision shape and adopted under the standing delegation: sparse only (git deliberately unimplemented, AC15), owners listing-plus-refusal (AC9), both name-collision classes refused (AC5), crates.io not preconfigured in v1, and the uniform 401 challenge reconciled with the existence rule via the OCI precedent (AC6). Sixteen criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here: an `auth.md` client-table row for cargo, a Cargo yank row beside the PyPI one in `proxy-cache.md`'s removal table, and a Cargo row in the management-surfaces analysis. Stays draft; awaits an independent review. |
