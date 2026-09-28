---
status: draft
status_description: "Data-loss fix 2026-09-28 at 93982ba on Opus (not a review): a CHECKSUMS entry naming a different SHA-256 for a cached archive now ends the old blob's cached reference at the new blob's commit, the route following the current CHECKSUMS; the row had kept the old blob 'while a retained revision names it', but a remote keeps no superseded CHECKSUMS and a mention keeps nothing alive (proxy-cache was-Q20, AC28); AC24 extended. Earlier: Reconciled 2026-09-28 at 20ff418 with the foundation wave on Opus (not a review): the index, 01mailrc and CHECKSUMS generated through signing-service's Indexer and generator package internal/format/cpan/index on the pre-commit hook, bodies declared through data-model's blob-digest list (AC27), CHECKSUMS signatures as Signature records assembled in the CPAN::Checksums cleartext framing (AC8), the per-pointer Last-Modified now data-model's moved_at rendered by ServeDocument (AC10), rotation announced then switched on the signing-key routes (AC11); publish, delete-version, annotate (author record) and configure (ownership transfer, key rotation) on management-api with the pause/authenquery binding and core-held retirement (AC12, AC15, AC16); 03modlist a descriptor (AC18); WriteRefusal with the shared Refused by policy phrase over the listener's default HTTP/1.1 (AC19); the restricted-egress or client-setting binding row; CHECKSUMS entries as declared digests, the cache-scoped Last-Modified and regression rule, proxy-cache event classes and refresh on the proxied path (AC23, AC24); the openpgp cleartext entry, trust set and keyserver import with repository-chain verdicts (AC25); the index.merge virtual merge with forward-moving freshness (AC26); CPANSA still out under supply-chain was-Q9 (AC28); Capabilities and the rename case (AC32). Earlier: authored 2026-09-26 from captures of cpanm 1.7049 and 1.7044, CPAN.pm 2.38 and 2.22, cpm 1.1.5 and 0.997024, Carton 1.0.35 and 1.0.34 and cpan-upload; seventeen questions adopted under the standing delegation; none open. Awaits a /spec review pass."
description: "Spec for CPAN (Perl) repositories served to cpanm, cpm, the core cpan client and Carton: a write-triggered 02packages index that maps packages to distributions under first-come indexing permissions this registry enforces, per-author-directory CHECKSUMS produced and clearsigned by the shared signing service, the 01mailrc and 03modlist files CPAN.pm refuses to run without, a cpanmetadb-shaped history route that makes pinned versions resolvable, a pointer-scoped Last-Modified that makes a rollback reach clients that revalidate, publish through the management API and a PAUSE-shaped cpan-upload binding, a byte-for-byte CPAN cache whose tarballs are gated on the upstream CHECKSUMS, and per-package virtual merges with reserved namespaces, with every client's route back to public CPAN named because a refusal holds only where that route is closed."
author: michielvha
goal: "Serve Perl teams a private CPAN and a verified cache of public CPAN that stock cpanm, cpm, the core cpan client and Carton (two generations each) install from on both paths, whose index no uploader can hijack, whose CHECKSUMS the verifying clients accept, and whose rollbacks reach every client, with the configuration that keeps each client from falling back to public CPAN proven rather than assumed."
priority: "low"
issue: 39
created: 2026-09-26
covers:
  - "internal/format/cpan/**"
  - "conformance/cpan/**"
fable_recheck: "authored on Opus 2026-09-27 while Fable was out of monthly credit; grounded in captured client traffic, but the design judgement was never Fable-reviewed; the data-loss fix on Opus 2026-09-28 folded proxy-cache's adopted Q20 into the removal table (the old archive blob released at the new commit, the route following the current CHECKSUMS), which needs the same recheck"
---

# Plan: CPAN (Perl) repositories

The CPAN mirror layout as Perl's installers read it, hosted, proxied and virtual, on one handler:
the generated package index `modules/02packages.details.txt.gz`, the author list
`authors/01mailrc.txt.gz`, the retired module list `modules/03modlist.data.gz`, distribution
archives under `authors/id/{X}/{XX}/{AUTHOR}/`, and the per-author-directory `CHECKSUMS` files,
plus a cpanmetadb-shaped resolution route and a PAUSE-shaped upload binding. The oracles are cpanm
1.7049 and 1.7044, the core `cpan` client (CPAN.pm 2.38 and 2.22), cpm 1.1.5 and 0.997024, Carton
1.0.35 and 1.0.34, and cpan-upload.

## Context

CPAN sits in Tier 3 of `formats/catalogue.md` as the single-ecosystem family "CPAN" (the row "CPAN
(Perl)"). **Its build is gated by `project-charter.md` AC9 and `catalogue.md` AC5**: no handler
code for a Tier 3 ecosystem exists before every Tier 1 format has met its definition of done and
the owner has recorded a `continue` verdict at the charter's build step 8, and Tier 3 handlers are
built at step 11. This spec exists now because the owner directed on 2026-09-26 that all 33
ecosystems be specced up front (the catalogue's "Every ecosystem below is specced now; only
building is gated"), so the gate decides what is built and never what is written; a `shrink`
verdict parks it. The shared signing and index service this format depends on is the first item
of the charter's step 7, so it exists before this handler whatever the verdict.

CPAN has **no published protocol specification and no standard upload API**. The mirror layout is
defined by what PAUSE writes and what the installers read, and PAUSE's upload is a web form. So the
grounding for this draft is captured traffic first, client source second, stated up front because
the constitution asks for evidence or silence:

- **Captured client traffic.** `which cpanm cpan cpm carton` finds none of them on this host (the
  host has only a system perl without `version.pm`), so every client ran in a container. The two
  official images, pinned by digest, `linux/amd64`:
  `docker.io/library/perl@sha256:67221028fee9cd9ebf4e2e579521bd241d4c6d9eb434cca9f0adda98f9c486e0`
  (tag `5.42`, Debian 13: perl 5.42.3, cpanm 1.7049, CPAN.pm 2.38, HTTP::Tiny 0.096,
  IO::Socket::SSL 2.099) and
  `docker.io/library/perl@sha256:bce047255ad2dba33936918a1b2e7b396c8824dedeae1d377aa85574031ef864`
  (tag `5.30`, Debian 11: perl 5.30.3, cpanm 1.7044, CPAN.pm 2.22, HTTP::Tiny 0.076, no
  IO::Socket::SSL). cpm and Carton ship in neither, so two images were derived from those digests
  by `cpanm` against the live CPAN: on 5.42, App::cpm 1.1.5, Carton 1.0.35 (Menlo 1.9019),
  OrePAN2 0.54, CPAN::Checksums 2.14, CPAN::Uploader 0.103019 and Module::Signature 0.96; on 5.30,
  App::cpm 0.997024, Carton 1.0.34 and Module::Signature 0.96. The derived 5.42 image also gained
  LWP and HTTP::Date as OrePAN2 dependencies, which changes CPAN.pm's transport and date parsing, so
  **every cpanm and CPAN.pm case was run on the two official images**, and the derived images were
  used only for cpm, Carton, cpan-upload and `--verify`. Every run had a fresh `HOME` unless it
  says otherwise, on a dedicated `--internal` Podman network (`cpancap-net`), against a logging
  static stub in `python:3.12-slim` pinned at
  `sha256:f77ac9e44ae96ef2c90b8053ea08c31f8be030f824196b0ae4db6d462c84e51f`, serving repositories
  under the path prefix `/cpan/{name}/` over HTTP and over TLS under a throwaway CA, with per-path
  rules injecting statuses, reason phrases, bodies, Basic challenges, byte swaps, alternative
  `CHECKSUMS` files and three `If-Modified-Since` policies. A second network with egress
  (`cpancap-egress`) carried the fallback cases and a byte-for-byte pass-through to the live
  `https://www.cpan.org/` under `/cpan/remote/`. The stub is not a reference implementation; the
  captures prove what the clients send and how they react.
- **The fixtures were real distributions.** ExtUtils::MakeMaker `make dist` built `Acme-Base` 1.0,
  1.1, 2.0 and the developer release 2.1_01 (packages `Acme::Base` and `Acme::Base::Util`),
  `Acme-App` 1.0 requiring `Acme::Base` 1.0, `Acme-Dotted` v1.2.3, `Other-Hijack` 9.0 under a second
  author `OTHER` declaring `package Acme::Base` at 9.0, and a private `Try-Tiny` 0.01 shadowing the
  public name. DarkPAN generations were built with OrePAN2's own `orepan2-inject` and
  `orepan2-indexer`, `CHECKSUMS` with PAUSE's library `CPAN::Checksums::updatedir`, clearsigned by
  `gpg --clearsign` with a throwaway RSA key, and `01mailrc` and `03modlist` written in the live
  files' shapes.
- **The sources, read this run.** cpanm's `App::cpanminus::script` from both images
  (`search_module`, `search_cpanmetadb_history`, `search_metacpan`, `cpan_dist`, `fetch_module`,
  `verify_archive`, `verify_checksum`, and 1.7044's `verify_checksums_signature`); cpm's `CLI.pm`
  (`generate_resolver`) and its `Resolver::02Packages`, `MetaDB` and `MetaCPAN`; CPAN.pm's
  `CPAN::Index` (`reload`, `reload_x`, `rd_modpacks`), `CPAN::FTP` (`localize`, `localize_2021`,
  `hostdl_2021`), `CPAN::HTTP::Client` and `CPAN::Distribution` (`verifyCHECKSUM`,
  `CHECKSUM_check_file`) at 2.38 and 2.22; Carton's `Carton::Builder` (`effective_mirrors`);
  `CPAN::Uploader` 0.103019; `CPAN::Checksums` 2.14; PAUSE's `doc/operating-model.md`; and Pinto's
  `Pinto::Manual::Introduction` (stacks and pins) as prior art beside OrePAN2 and CPAN::Mini.
- **The live upstream.** `www.cpan.org` and `cpan.metacpan.org` sampled directly on 2026-09-27:
  `02packages.details.txt.gz` (2,532,586 bytes, `Written-By: PAUSE version 1.005`,
  `Line-Count: 261397`, `Last-Updated: Sun, 27 Sep 2026 13:54:24 GMT`, 44,419 distinct distribution
  paths, 76,039 `undef` versions, 8,067 versions written as `v`-strings, and no two package names
  differing only in case); `01mailrc.txt.gz` (252,889 bytes, 14,748 `alias` lines);
  `03modlist.data.gz` (248 bytes, last modified 2014-04-03, "This was once the registered module
  list but has been retired", `Modcount: 0` and a `sub data { return {}; }`); `06perms.txt.gz`
  (668,041 lines of first-come and co-maint permissions); author `CHECKSUMS` files and their
  signatures; every route's headers; and PAUSE's upload endpoint, which answers `401` with
  `WWW-Authenticate: Basic realm="PAUSE"`.
- **The resolution services the clients consult.** MetaCPAN's
  `https://fastapi.metacpan.org/v1/download_url/{Module}` (JSON naming `download_url`,
  `checksum_sha256`, `status` and `version`, `Cache-Control: private`, and a JSON `404`) and
  cpanmetadb's `https://cpanmetadb.plackperl.org/v1.0/package/{Module}` (`text/yaml` naming
  `distfile`, `provides` and `version`, `max-age=1800`) and `/v1.0/history/{Module}` (one
  `{module} {version} {distfile}` line per indexed release), both answering `404` "Not found" for an
  unknown module.
- **OSV, CPANSA and purl.** OSV's `ecosystems.txt` (46 entries) lists no CPAN ecosystem,
  `CPAN/all.zip` answers `404`, the query API answers `{"code":3,"message":"invalid ecosystem"}` for
  `"ecosystem":"CPAN"` and `{}` for `pkg:cpan/Plack@1.0050`. The CPAN Security Advisory feed that
  CPAN::Audit consumes (release `20260923.001` of `briandfoy/cpan-security-advisory`) holds 2,117
  advisories over 434 distributions, keyed by distribution name with version-range strings and CVE
  aliases. The purl `cpan` type names the distribution, case-sensitively, with the CPAN author ID as
  an optional qualifier (all captured 2026-09-27).

Where the sources and the captures disagree, the captures win, and four disagreements are recorded
because they would otherwise be built from the documents. **CPAN.pm 2.38 ignores the configured
`urllist` entirely** under its default `pushy_https`: `cpan -M http://darkpan/...` fetched
`https://cpan.org/authors/01mailrc.txt.gz` and never the stub (captured; `localize_2021` hard-codes
the base), so a private mirror needs `pushy_https` set to `0`. **cpanm's `--verify` needs
Module::Signature even on 1.7049**, which no longer checks signatures: without it cpanm printed
"WARNING: Module::Signature and Digest::SHA is required for distribution verifications." and
installed unverified (captured on both official images). **cpanm 1.7044's CHECKSUMS signature
check accepts anything**: it printed "Verified OK!" after gpg reported a `BAD signature` and for an
unsigned file, and installed past a signature by a key it did not hold (captured, with the key imported
and without). And **Carton silently adds public
CPAN behind any configured mirror**: `effective_mirrors` appends `http://cpan.metacpan.org` and
`http://backpan.perl.org` (source; every refusal captured falling through to them).

Seven things make this format worth a careful spec. **The index is one generated document mapping
packages to distributions**, holding only the newest indexed release per package, and who may claim
a package is the registry's decision: OrePAN2, the common DarkPAN tool, indexed `Acme::Base` from
`OTHER`'s `Other-Hijack` 9.0 by version alone, and cpanm installed it (captured). **Integrity rests
on per-author `CHECKSUMS` that only CPAN.pm checks by default**: cpanm, cpm and Carton installed
swapped bytes silently (captured). **Almost every client falls back to public CPAN when refused or
when a name is missing**, each by a different route. **A rollback is masked** by `If-Modified-Since`
revalidation in cpm and Carton and by CPAN.pm's one-day index cache. **CPAN.pm has hard file
requirements** a DarkPAN tool does not meet. **Publishing has no standard API**, and the one real
tool binding, cpan-upload, sends its form fields in a different order on each run. And **OSV covers
nothing on CPAN**.

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every handler
(`format-handler-interface.md` AC8). CPAN is Tier 3, so the catalogue's Tier 1 gate (its AC5) and
the charter's breadth verdict (its AC9, build step 8) both precede it, and it is built at step 11.
This format needs only the format-first mount `/cpan/{repository}/`: every client appends
`modules/...`, `authors/...` and the author path to whatever base it is given, path included
(captured under `/cpan/{name}/` for cpanm, cpm, CPAN.pm, Carton and cpan-upload), so no root-anchored
claim is made.

**The shared signing and index service must be `planned` before Phase 1.** Every hosted and virtual
`02packages`, `01mailrc` and `CHECKSUMS` body, and every `CHECKSUMS` signature, is produced by
`docs/internal/plans/foundation/signing-service.md`, the first item of the charter's step 7: through
the optional `Indexer` interface and this format's generator package `internal/format/cpan/index`,
run by the shared write path's pre-commit hook (its "The generator contract" and "The write path
dispatches", AC1), with the OpenPGP cleartext codec in `CPAN::Checksums`' framing that its Phase 2
builds. What this format requires of it is stated in Design ("What the signing and index service
must provide"), each item mapped onto that spec's contract, never designed here.

**The management API must be `planned` before Phase 2.** Publish, deletion, author records, the
transfer of indexing ownership and key rotation are operations of
`docs/internal/plans/foundation/management-api.md`, whose core the charter builds at step 2 and whose
publish and bindings land in its Phases 2 and 3; its cross-format reconciliation table carries this
format's four rows, and the cpan-upload route is the binding `POST pause/authenquery` onto its
`publish` kind.

**The data model carries what this format needs; it must be `planned` before Phase 1**, which the
signing service's own Phase 1 entry condition already requires. The two revisions this spec reused
from its siblings are in `data-model.md`: the declared blob-digest list a document uses to name the
blobs it consists of, which this format's generated-body manifest is, and the pointer's freshness
record, whose forward-moving `moved_at` is this format's per-pointer `Last-Modified` (its "Freshness
scoped to the pointer, and the documents that hang on it", AC36, AC37), marked through by
`storage-and-gc.md`'s fourth root (its AC16). Neither is a table this handler owns.

**The proxied path depends on shared services that now exist as specs**: the transport of
`docs/internal/plans/foundation/upstream-adapters.md` (charter step 4; its requirements table row for
this format: identity `Accept-Encoding`, conditional revalidation and an optional Basic credential to
the root host, its AC5, AC6, AC15, AC22), the fetch-and-cache contract of `proxy-cache.md` (declared
digests, the cache-scoped freshness record, the removal event classes), and the OpenPGP cleartext
entry of `docs/internal/plans/foundation/artifact-verification.md` (its `openpgp` scheme and AC11,
built with this format in its Phase 4 at step 11). The virtual merge runs as the `index.merge` job on
`docs/internal/plans/foundation/async-operations.md`'s queue core, which the charter builds at the
start of step 4b; that spec must be `planned` before Phase 5.

## Scope

**In scope:**

- **The read surface** under `/cpan/{repository}/`: `modules/02packages.details.txt.gz`,
  `authors/01mailrc.txt.gz`, `modules/03modlist.data.gz`, `authors/id/{X}/{XX}/{AUTHOR}/CHECKSUMS`,
  and distribution archives under `authors/id/{X}/{XX}/{AUTHOR}/`, in author subdirectories too on
  the proxied path.
- **The resolution route** `metadb/v1.0/package/{Module}` and `metadb/v1.0/history/{Module}` in
  cpanmetadb's shapes, which cpanm's `--cpanmetadb` and cpm's `metadb` resolver read.
- **Nine clients as oracles on both paths**: cpanm 1.7049 and 1.7044, CPAN.pm 2.38 and 2.22, cpm
  1.1.5 and 0.997024, Carton 1.0.35 and 1.0.34 (`install` and `install --deployment`), and
  cpan-upload 0.103019 for publish.
- **The generated index** under first-come indexing permissions keyed to distributions, following
  PAUSE's indexing rules for developer releases, `provides`, `no_index` and non-decreasing versions.
- **`CHECKSUMS` per author directory**, produced and clearsigned through the shared signing service.
- **Hosted publish** through the management API and through `POST pause/authenquery`, a binding onto
  it, with ingest validation.
- **Deletion, author records and ownership transfer** as registry-owned management operations.
- **Non-interactive authentication** in the forms the clients send, and the per-route addressed
  objects `auth.md`'s pattern scopes evaluate, including the pattern-refusal case its AC8 requires.
- **The rendering of a shared policy refusal**, and the absence of OSV coverage in the default feed.
- **The proxied path** against any CPAN mirror or DarkPAN base URL, `www.cpan.org` first: metadata
  served byte for byte, tarballs committed only against the upstream `CHECKSUMS`, the signature
  verdict when upstream keys are configured, and this format's rows of the removal table.
- **Virtual repositories**, merged per package with reserved namespaces and re-signed where members
  share an author directory.
- **Every client's fallback route to public CPAN**, named, with the configuration that closes each
  one proven at the network layer.
- **The declared capabilities** `format-handler-interface.md` AC13 names, and the shared rename case
  `repository-lifecycle.md` AC12 requires of every format.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition of
done requires the deliberately unimplemented surface to be named:

- **MetaCPAN's API** (`fastapi.metacpan.org`: `download_url`, search, release and author
  documents). cpanm hard-codes its URL (`search_metacpan`, source) and consults it only for
  developer releases and as a fallback after cpanmetadb, and every range it answers is answerable
  from the cpanmetadb-shaped history route, which both cpanm and cpm can be pointed at (captured).
  A client told to use MetaCPAN reaches the public service whatever this registry serves.
- **`06perms.txt` and PAUSE's permission model of people.** No client in the matrix requests
  `06perms.txt` (captured). This registry's authorization is `auth.md`'s, and indexing ownership is
  keyed to distributions, not to PAUSE IDs (the resolved permissions decision below).
- **PAUSE's web interface** beyond the upload form's one route: account pages, "force reindexing",
  permission grants, the "delete files" page and the upload-by-URL field (`pause99_add_uri_uri`, sent
  empty by cpan-upload, captured). Every one of those operations exists here as a management
  operation.
- **Author subdirectories on hosted publish** (`cpan-upload -d`), per the resolved archive decision
  below. The proxied path serves them, since 926 of the live index's paths use one.
- **The uncompressed `02packages.details.txt`, `CHECKSUMS.gz`, `01mailrc.txt` and `MIRRORED.BY`.**
  No client in the matrix requests them while the compressed or plain forms exist: CPAN.pm asks for
  `CHECKSUMS.gz` only after `CHECKSUMS` fails (captured), and a hosted author directory holding a
  file always has a `CHECKSUMS`. They answer `404`.
- **Distribution `SIGNATURE` files (Module::Signature).** They are author-signed manifests inside the
  archive that CPAN.pm checks after unpacking when `check_sigs` is on; the registry stores the
  archive's bytes and never parses or produces them.
- **CPAN Testers, ratings, `Changes` and documentation rendering.** No installer reads them.

## Design

### The wire surface, as captured

Every route hangs off `/cpan/{repository}/`, format-first per `format-handler-interface.md`'s
resolved URL-shape decision. cpanm takes it as `--mirror`, cpm as `--mirror` or in
`--resolver 02packages,{url}`, CPAN.pm as an `urllist` entry, Carton as `PERL_CARTON_MIRROR`, and
cpan-upload through the environment variable `CPAN_UPLOADER_UPLOAD_URI` (it has no command-line
option for it; "Unknown option: upload-uri", captured).

| Surface | Shape, as the pinned clients send it |
|---|---|
| Index | `GET modules/02packages.details.txt.gz`, whole. cpanm (wget backend on both images, `Accept-Encoding: identity`) sends no conditional header on any run; cpm 1.1.5 (HTTP::Tiny) and Menlo inside Carton send `If-Modified-Since` with the stored `Last-Modified` when a copy exists; cpm 0.997024 uses curl; CPAN.pm refetches only after `index_expire` (one day) or `reload index` (captured, source `reload_x`) |
| Author and module lists | CPAN.pm alone fetches `authors/01mailrc.txt.gz` and `modules/03modlist.data.gz`, before the index, and fails without either, exit 2 (captured on both lines) |
| Distribution | `GET authors/id/{X}/{XX}/{AUTHOR}/{file}`, the path the index names; cpanm and cpm fetch it once per run, Menlo up to three times on failure, CPAN.pm through HTTP::Tiny then wget, then the next `urllist` host (captured) |
| Checksums | CPAN.pm fetches `authors/id/{X}/{XX}/{AUTHOR}/CHECKSUMS` after the archive, on every install, and then `CHECKSUMS.gz` if that fails (captured); cpanm only under `--verify` (captured); cpm and Carton never (captured) |
| Resolution | cpanm without `--mirror-only` asks cpanmetadb, then MetaCPAN, then the mirror's index (captured); cpm without `--mirror-only` or `--resolver` never reads the mirror's index at all (MetaCPAN for developer releases, cpanmetadb, then MetaCPAN, captured in its build log); both accept a cpanmetadb-shaped base of our own (`--cpanmetadb`, `--resolver metadb,{metadb},{mirror}`, captured) |
| Publish | cpan-upload sends `POST {uri}?ACTION=add_uri` with preemptive Basic (`-u` as user, `-p` as password) and `multipart/form-data; boundary=xYzZY` carrying `HIDDENNAME`, `CAN_MULTIPART=1`, `pause99_add_uri_upload` (the filename), `pause99_add_uri_uri` (empty), `SUBMIT_pause99_add_uri_httpupload`, optionally `pause99_add_uri_subdirtext`, and the file part `pause99_add_uri_httpupload` with `Content-Encoding: gzip` and `Content-Type: application/x-tar` part headers; **the part order differed between two runs** (the file part first in one, third in the other, captured). Any non-error status prints "PAUSE add message sent ok [{code}]" |
| User agents | `cpanminus/{version} perl/{perl}`, `App::cpm/{version} perl/{perl}` or `App::cpm/{version}`, `HTTP-Tiny/{version}` and `Wget/{version}` from CPAN.pm, `Menlo/1.9019` from Carton, `CPAN::Uploader/0.103019` (captured) |

**Error rendering**, captured, because a refusal nobody can read is a refusal nobody can act on. **No
client prints a response body.** What reaches the user is the status and the HTTP reason phrase:
CPAN.pm prints "HTTP::Tiny failed with code[403] message[{reason}]" and wget's "ERROR 403:
{reason}."; cpm 1.1.5 and 0.997024 write "403 {reason}" to `~/.perl-cpm/build.log` and print "FAIL
fetch" or "FAIL install"; cpanm prints the reason only under `-v` (wget's output), and otherwise
"! Failed to unpack {file}: no directory", since the failed download leaves nothing to unpack; Carton
exits 25 with "Installing modules failed" (all captured with a custom reason phrase); and cpan-upload
prints "request failed with error code {code}" and "Message: {reason}" (source `_upload`).

### How the clients decide, and the three cross-format checks

**Does the client verify what it downloads? CPAN.pm yes, by default; cpanm only when asked; cpm and
Carton never.** CPAN.pm checks every archive against the SHA-256 in its author directory's
`CHECKSUMS` (Digest::SHA is core) and dies on a mismatch, "Checksum mismatch for distribution file.
Please investigate.", exit 255, on both lines (captured with 1.0's bytes served at 1.1's path). It
refuses a missing `CHECKSUMS` (exit 2), and 2.38 refuses an entry without `cpan_path` non-
interactively, "The cksum does not contain the key 'cpan_path'", "Proceed nonetheless? [no] no",
exit 25, where 2.22 accepts it (captured). With `check_sigs` on, 2.38 runs `gpg --verify` itself and
dies "gpg run was failing, cannot continue" for a missing key, a bad signature and an unsigned file,
accepting only a good signature; 2.22 checks nothing without Module::Signature, which the official
image lacks (captured). cpanm `--verify` checks the SHA-256 against `CHECKSUMS` ("! Checksum
mismatch for Acme-Base-1.1.tar.gz", captured on both lines with Module::Signature installed) and
fails a missing `CHECKSUMS` ("Checksum file ... is broken"), and its 1.7044 signature step accepts
anything (Context). cpm on both lines and Carton installed the swapped bytes and reported success;
cpm 0.997024 printed "DONE install Acme-Base-1.1" over 1.0's code, and Carton's
`cpanfile.snapshot` recorded `Acme-Base-1.1` as providing `Acme::Base 1.0` (captured). That places
CPAN between `puppet.md`, whose clients all check a server-supplied digest, and `conan.md` and
`chef.md`, whose clients check nothing: the checksum comes from the same server as the bytes, so it
is a transit and storage check, and only the signature, checked by CPAN.pm 2.38 alone, reaches past
the server. The registry's obligations are to serve a correct, signed `CHECKSUMS` for every author
directory (Design, "CHECKSUMS"), and to make the proxied path's tarball gate real (Design, "The
proxied path").

**Is a rollback visible? Only if the served `Last-Modified` moves forward, and to CPAN.pm only after
its index cache expires.** After cpm 1.1.5 installed `Acme::Base` 2.0 and the stub moved the
repository back to the generation before it, cpm's next run sent `If-Modified-Since: Sun, 27 Sep 2026
17:00:00 GMT`; a server answering `304` whenever the stored file is not newer (the rolled-back index
was written at 16:00) kept cpm on the newer index, and cpm then failed to fetch the 2.0 archive the
rolled-back repository no longer held. Answering `304` only for an exact match, or serving the
rolled-back index with a `Last-Modified` later than any served before, made cpm resolve 1.1 (all
three captured). Menlo sends the same header inside a Carton run (captured). cpanm refetches the
index whole every run and sees the rollback at once (captured). CPAN.pm reads its cached index for
`index_expire` days, one by default, so a second run inside the window reinstalled 2.0 from its own
cache with no request, and `reload index` then fetched the rolled-back index (captured); nothing a
server sends shortens that, and the operator documentation says so. It never compares
`Last-Updated` with the previous index (it went backwards without comment, captured). So, as in
`debian.md` and `conan.md`, **freshness belongs to the pointer, not the snapshot** (Design,
"Pointers, rollback and freshness").

**Does the client fall back when refused? Yes, by a different route on each client, and a refusal
holds only where that route is closed.** Captured, one route per client:

| Client | Route to public CPAN | What closes it |
|---|---|---|
| cpanm, default | cpanmetadb and MetaCPAN resolve first; a name public CPAN also has resolves to the public distribution, fetched from the configured mirror by its public path (a `404` from the stub for `E/ET/ETHER/Try-Tiny-0.32.tar.gz` while the private `Try::Tiny` 0.01 was never read); a non-latest version resolved from cpanmetadb history is fetched from `https://backpan.perl.org` first, and one resolved from MetaCPAN from `https://cpan.metacpan.org` only (source; `Try::Tiny@0.31` installed from backpan, captured with egress) | `--mirror-only`: the private 0.01 then installed (captured) |
| cpanm with our history route | a non-latest version is still tried at `https://backpan.perl.org` before the mirror (captured: backpan unreachable, then the mirror) | client egress restricted to this registry |
| cpm, default | the mirror's index is never read; cpanmetadb and MetaCPAN resolve, and `--dev` fetches from `https://cpan.metacpan.org` directly (captured) | `--mirror-only` (1.1.5) or `--resolver 02packages,{url} --no-default-resolvers` (both), captured |
| CPAN.pm 2.38 | `pushy_https`, on by default, sends every request to `https://cpan.org/` (captured) | `pushy_https` set to `0` |
| CPAN.pm, both | after a `403` from one `urllist` host, the next host is tried (captured) | one `urllist` entry |
| Carton, both | after a `403` or `404` from the mirror, the same path at `http://cpan.metacpan.org` and then `http://backpan.perl.org`, plain HTTP; a name missing from our index resolves from `cpan.metacpan.org`'s index (captured: `Try-Tiny-0.32` from public CPAN in `cpanfile.snapshot`) | client egress restricted to this registry; Carton has no option that removes its added mirrors (`effective_mirrors`, source) |

The two fallbacks Carton and cpanm take by author path turn a refusal into a download from whoever
holds that author ID on PAUSE, which is why the author-directory decision below matters. The
operator documentation carries one recipe per client (the right-hand column), states that Carton
and cpanm's history fallback can be closed only by egress, and AC22 proves each recipe at the
network layer.

### The index: one generated document, and who may claim a package

What the clients read from `02packages.details.txt.gz`, captured and read in the sources:

- **A header, a blank line, then one line per package**: `{package} {version} {path}`, whitespace
  separated, the path relative to `authors/id/`. cpanm matches `^\Q{module}\E\s+([\w\.]+)\s+(\S*)`
  (`search_mirror_index_file`), so matching is exact and case-sensitive on every client (`acme::base`
  failed on cpanm, cpm and CPAN.pm, captured).
- **CPAN.pm reads the header and nothing else checks it.** It compares `Line-Count` with the lines
  it sees and warns on a mismatch, and parses `Last-Updated` with HTTP::Date when installed and
  otherwise with a regular expression expecting PAUSE's RFC 1123 form. OrePAN2 writes
  `Last-Updated: Sun Sep 27 17:18:30 2026`, which **crashed CPAN.pm on both official images**, "Day
  '' out of range 1..31 at .../CPAN/Index.pm line 340." (captured; the images carry no HTTP::Date);
  the same index with `Last-Updated: Sun, 27 Sep 2026 17:18:30 GMT` installed. An index older than
  thirty days by `Last-Updated` draws a warning (source `rd_modpacks`).
- **One line per package, so one version per package.** The index names only the release it
  selects; an older release is reachable only by path. `cpanm Acme::Base@1.1` against an index
  naming 2.0 failed "Found Acme::Base 2.0 which doesn't satisfy == 1.1", and
  `cpanm ACME/Acme-Base-1.1.tar.gz` installed it (captured). Pinto calls one index a "stack" for
  exactly this reason ("Only one version of a package can exist within a stack").
- **Version strings are written as the package declares them**: the live index keeps `v1.1.0` and
  `undef` (8,067 and 76,039 lines); OrePAN2 numified `v1.2.3` to `1.002003` (captured), a
  divergence this generator does not copy.

**The registry decides what the index says, which is where the trap is.** OrePAN2 has no permission
model: given `Acme-Base` from `ACME` and `Other-Hijack` 9.0 from `OTHER` declaring `package
Acme::Base`, it indexed `Acme::Base 9.0 O/OT/OTHER/Other-Hijack-9.0.tar.gz`, and `cpanm Acme::App`
then installed `Other-Hijack` and printed `Acme::Base 9.0` (captured). It also indexed the developer
release 2.1_01 for `Acme::Base::Util`, which PAUSE never indexes. PAUSE's rules, from its operating
model: an upload is a developer release when its filename matches `/\d\.\d+_\d/` or `-TRIAL[0-9]*`
before the extension, and none of its packages is indexed; a package whose `$VERSION` holds an
underscore is not indexed; the uploader needs an indexing permission on the main module and on each
package; a package's indexed version never decreases; `no_index` excludes packages; a `provides`
list is trusted and a package absent from it is not indexed; and a newline between `package` and
the name hides a package. The live `06perms.txt` holds 668,041 first-come and co-maint grants.

This registry has no PAUSE accounts; its authorization is `auth.md`'s. Per the resolved permissions
decision below, **indexing ownership is first-come per package, keyed to the distribution**: the
first distribution to have a package indexed owns it in that repository, a publish of any other
distribution providing an owned package is refused `409` naming the package and its owning
distribution, and ownership moves only by an administrative transfer through the management API.
Per the resolved index-rules decision below, **each package's line names, among the owning
distribution's non-developer, non-retired releases that provide it, the one with the highest version
of that package** under `version.pm`'s ordering, ties going to the later publish; a release that
provides a package at a lower version than the indexed one is stored and published but not indexed
for that package, and the publish response says so. `version.pm`'s ordering is not semver: `1.1` and
`1.10` are equal, `0.9` is above `0.10`, `1.1` is above `1.1.0`, and `1.002003` equals `v1.2.3`
(checked this run with `version->parse` in the 5.42 image).

**Where the provided packages come from**, per the resolved extraction decision below: a `provides`
map in `META.json` (or `META.yml` when there is no `META.json`) is trusted, as PAUSE trusts it;
otherwise the ingest reads every `.pm` file outside the META's `no_index` directories and packages
(generated META files already list `t` and `inc`, captured in the fixtures) for `package NAME`
statements and literal `$VERSION` assignments in a closed static grammar, never executing Perl, and a
package whose version the grammar cannot read is indexed as `undef`, which PAUSE also writes. The
fixtures' MakeMaker META carried no `provides`, and OrePAN2 reported "Scanning for provided modules"
(captured), so the static path is the common one.

The generated header is PAUSE's: `File`, `URL`, `Description`, `Columns`, `Intended-For`,
`Written-By`, `Line-Count` equal to the number of package lines, and `Last-Updated` in RFC 1123 form
in GMT, then a blank line; lines sorted by package name.

### CHECKSUMS: produced, and signed per author directory

**This registry produces a `CHECKSUMS` for every author directory holding a file, and signs it**,
per the resolved checksums decision below, because CPAN.pm refuses to install without one and
`check_sigs` is the one end-to-end check any client in the matrix makes. The body is what
`CPAN::Checksums::updatedir` writes and every client parses, captured on the live files and the
fixtures:

- **The shape**: `0&&<<''; # this PGP-signed message is also valid perl`, then a cleartext OpenPGP
  signed message (`Hash: SHA512` on the live files) whose text is a comment line naming the writer,
  `$cksum = { '{file}' => { ... }, ... };` and `__END__`, then the signature. cpanm evaluates the
  whole file in a `Safe` compartment (`verify_checksum`), and CPAN.pm evaluates it in `Safe` or, with
  `check_sigs`, evaluates what `gpg --verify --output` extracts; the leading line makes the armour
  valid Perl.
- **Each entry** carries `cpan_path` (the directory relative to `authors/id`, required by CPAN.pm
  2.38, captured), `md5`, `md5-ungz`, `mtime` (the file's publish date, `YYYY-MM-DD`), `sha256`,
  `sha256-ungz` (CPAN.pm accepts a match on either SHA-256, source) and `size`, keys sorted, one
  entry per file in the directory, `CHECKSUMS` itself excluded.
- **The generator is this registry's own**, byte-compatible with the shape above and proven by the
  real clients rather than by running `CPAN::Checksums`; it writes the entries in a fixed order so an
  unchanged directory keeps an unchanged body.

**The signature is PAUSE's kind: a repository signature over the directory's digests**, by a key
per hosted and per virtual repository held by the signing service. PAUSE's own history shows what
key distribution costs: the key PAUSE's about page exports (primary
`2E66557AB97C19C791AF8E20328DA867450F89EC`, "PAUSE Batch Signing Key 2026") verifies MIYAGAWA's
`CHECKSUMS` written in May, but its signing subkeys expired on 2026-07-02, and ETHER's `CHECKSUMS`
written on 2026-09-22 is signed by subkey `4584D789E682F9F53B392F1837D079412CC9032E` ("PAUSE Batch
Signing Key 2027"), which only the public keyservers carry; with the about page's export, CPAN.pm
2.38 under `check_sigs` refused ETHER's archive through the pass-through (captured). So rotation
here is announced through the management surface before the new key signs, and AC11 proves a
rotated repository verifies under the new key.

**Where a signature lives.** A directory's body is snapshot content, so a repoint restores it with the
files it describes, as `data-model.md` AC13 requires. The signature is not: it is a `Signature`
record keyed by the body's digest and the key, produced inside the write for a new body, at every
pointer transition for a body the pointer will serve with no signature under the current key (inside
the repoint, `signing-service.md` AC9), and at a key rotation for every body any pointer serves, and
never on a read (per the resolved checksums decision below). `signing-service.md` generalised exactly
this design to every signed format (its resolved signature-placement decision, was Q2 there, which
cites this spec's wording) and `data-model.md` holds the record (AC37). The served file is
**assembled** from body and record by the cleartext framing, the leading line, the armour header,
the dash-escaped body and the signature block, never by a signing operation on a read
(`signing-service.md` AC6). No client checks a `CHECKSUMS` file's freshness (source, both clients),
so nothing about it is pointer-scoped beyond the key.

### The author list and the module list

CPAN.pm refuses to run without both (captured, exit 2 for either missing), so both are served on
every repository type:

- **`01mailrc.txt.gz`** is generated inside every write that adds an author directory: one line per
  author ID holding a release, `alias {ID} "{name} <{email}>"`, padded as the live file pads it,
  sorted by ID, from the repository's author records (Design, "Mapping onto the shared model"). CPAN.pm
  shows it in its distribution report ("CPAN_USERID ACME (Acme Corp <acme@example.com>)", captured).
- **`03modlist.data.gz`** is a constant: the retired list's header and `sub data { return {}; }`,
  the live file's shape, with this registry's `Written-By`.

### The resolution route: pinned versions

The index holds one release per package, so a pinned or ranged requirement below the newest (a
`cpanfile` `== 1.1`, `cpanm Foo@1.1`) cannot resolve from it (captured). Both cpanm and cpm can read a
cpanmetadb-shaped service at a base of our choosing, so per the resolved resolution-route decision
below every repository serves it under `metadb/v1.0/`:

- **`package/{Module}`**: `text/yaml`, the fields cpanmetadb returns (`distfile`, `provides`,
  `version`) for the release the index names; `404` with a `text/plain` body `Not found` otherwise.
- **`history/{Module}`**: `text/plain`, one line `{module} {version} {distfile}` per non-developer,
  non-retired release of the owning distribution that provides the module, oldest first, as
  cpanmetadb orders them (both clients sort after reading, source); `404` for an unknown module.

Captured against a stub route in these shapes, with `Acme::Base` 2.0 indexed: cpm 1.1.5 with
`--resolver metadb,{base}/metadb/v1.0/,{base} --no-default-resolvers` resolved `Acme::Base@1.1`
("Resolved Acme::Base (== 1.1) -> .../Acme-Base-1.1.tar.gz from MetaDB") and fetched it from the
registry alone; cpanm 1.7049 with `--cpanmetadb {base}/metadb/v1.0/` resolved it and **tried
`https://backpan.perl.org` first**, because `search_cpanmetadb_history` prepends backpan for any
non-latest version, and then fetched from the registry. The route's documents are rendered on read
from the snapshot's documents, like the index lines they restate, so they follow pointers with no
generation of their own; nothing in them is signed. The operator documentation says cpanm users of
the route must restrict egress (the fallback table).

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- **A `Package` is a distribution name** (`Acme-Base`), byte for byte, the purl `cpan` type's name.
- **A `Version` is a distribution version** as the filename carries it (`1.1`, `v1.2.3`, `2.1_01`,
  `1.0-TRIAL`). Its document holds the author ID, the archive filename, its SHA-256, MD5, their
  `-ungz` forms, size and publish date, the developer flag, and the provided packages with their
  versions and whether each is indexable (`no_index`, the newline hack, an underscore).
- **`File`**: one per version, the archive, keyed by CAS digest.
- **The retirement set is not in any document**: each deleted version is a core-held `Retirement`
  record, written in the deleting operation's transaction, outside snapshot content and never pruned
  (`management-api.md`, "Retirement is core-held", its resolved retirement-placement decision, was Q3
  there; `data-model.md` AC35), so no repoint can restore a document that predates a deletion.
- **The repository-level document** holds the **ownership map** (package name to owning
  distribution, with its case-folded key for the case rule below), the **author records** (ID, name,
  email), the reserved namespaces of a virtual repository, and the **generated-body manifest**: the
  CAS digest of the current `02packages` body, of `01mailrc`, and of each author directory's
  `CHECKSUMS` body, declared to the core as the document's blob-digest list: the generator's
  `Generate` returns the digests beside the document (`signing-service.md`, "The generator
  contract"), `data-model.md` carries the list (AC37), and `storage-and-gc.md`'s fourth root marks
  through it (its AC16), so a body is live while any current or retained document declares it.
- **Not snapshot content**: the `CHECKSUMS` signatures (`Signature` records), the per-pointer
  `Last-Modified` (the pointer's `moved_at`, Design, "Pointers, rollback and freshness"), a remote
  repository's cached upstream documents with their cache-scoped `adopted_at` (`data-model.md` AC44),
  and the verdicts on proxied archives (`artifact-verification.md`'s records, keyed by digest).

The `02packages` body is regenerated whole on every write that changes a package line, and a hosted
repository's index is small beside the live one (2.5 MB compressed for 261,397 lines, captured);
whole regeneration costs one CAS blob per changed snapshot, which the retention window already
bounds, per the resolved checksums decision's storage note.

### The hosted publish path and what counts as a write

Publishing is the `publish` kind of `docs/internal/plans/foundation/management-api.md`, taking the
archive and the author ID (the declared coordinate: author, distribution and version) and nothing
else, through that spec's upload sessions or its multipart convenience form ("Publish through the
API"), and per the resolved binding decision below **`POST {base}/pause/authenquery` is a client
binding onto it** for cpan-upload, Dist::Zilla's `UploadToCPAN` and Minilla, which all send through
CPAN::Uploader; its reconciliation table names that binding for the CPAN row. The handler declares
the kinds through the optional `Operator` interface's `Operations()` and the route through
`Bindings()`, and the route has no behaviour of its own: it reads the author ID from `HIDDENNAME` (the
same value cpan-upload sends as the Basic user, which `auth.md` ignores) and streams the archive from
the `pause99_add_uri_httpupload` part into the CAS, in whatever order the parts arrive (captured in two
orders), storing the part's bytes as sent, never applying the part's `Content-Encoding: gzip`, which
describes the archive and not a transfer encoding; it then submits the `publish` operation through
`Submit`, the entry point the API uses, so the two produce byte-identical documents and snapshot
deltas (`management-api.md` AC8). The binding renders the operation's outcome in the form cpan-upload
reads: `200` with a one-line `text/plain` body (cpan-upload prints only "PAUSE add message sent ok
[200]"); `400` for what the handler's `Apply` refuses as `validation`, `409` for a `conflict` and for a
coordinate the shared write path refuses as `retired` before `Apply` runs (`management-api.md`
AC12), and `401` and `404` per `auth.md`, each with a reason phrase naming the rule, since cpan-upload
prints the reason phrase and not the body; and `405` with the `repository-type` problem against a
remote or virtual repository, identically through the binding and the API (`management-api.md`
AC7). The publish result document the handler writes for the `Operation` lists each package not
indexed with its reason, the response shape `management-api.md` names for this format.

What ingest enforces, each refusal naming the rule and committing nothing:

- **The filename**: `{Dist}-{version}{ext}`, `Dist` hyphen-separated words of `[A-Za-z0-9_]` starting
  with a letter, `version` either `v?[0-9]+(\.[0-9]+)*(_[0-9]+)?` or that followed by `-TRIAL[0-9]*`,
  and `ext` one of `.tar.gz`, `.tgz`, `.zip` and `.tar.bz2`, the four extensions the live index uses
  (43,821, 381, 177 and 9 paths; 31 paths use none of them), per the resolved archive decision below.
- **The archive**: every entry under one top directory equal to the filename without its extension
  (cpanm unpacks by the first entry's top directory, `untar` in its source); regular files and
  directories only, no absolute path and no `..` segment.
- **Identity**: where `META.json` or `META.yml` names `name` and `version`, they agree with the
  filename (`name` with `::` or `-`, as generated META files spell it).
- **The author ID**: `[A-Z][A-Z0-9-]{1,8}`, the shape of every author directory on the live index
  (all 44,419 paths, none longer than nine characters). An ID not yet in the repository's author
  records is created with the ID as its name, and its display name and email are set through the
  management API (the resolved author-directory decision below).
- **Packages**: Perl package names `[A-Za-z_][A-Za-z0-9_]*(::[A-Za-z0-9_]+)*` in ASCII; an owned
  package from another distribution answers `409` naming the owner; a new package equal to an owned
  one under case folding answers `409` (the resolved case decision below).
- **Coordinates bind one set of bytes for the life of the repository.** A version of a distribution
  that exists answers `409` unless the bytes are identical, which answers `200` and creates no
  snapshot; a deleted version answers `409` with any bytes, including after the deleting snapshot is
  pruned and across a backwards repoint, because its `Retirement` record is core-held and checked
  centrally (`management-api.md` AC12, `data-model.md` AC35); a version equal to an existing one under
  `version.pm` (`1.10` beside `1.1`) answers `409`.
  The coordinate is the distribution and version, whatever the author ID, so a second author cannot
  republish `Acme-Base-1.1`.
- **No subdirectory and no upload by URL**: a `pause99_add_uri_subdirtext` field, or a non-empty
  `pause99_add_uri_uri` (PAUSE's fetch-from-URL field, sent empty by cpan-upload), answers `400`.

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. CPAN's
declaration:

- **One publish is one completed logical write and one snapshot**, carrying the archive, the version
  document, the author directory's new `CHECKSUMS` body and its signature, the new `02packages`
  body when a package line changes, `01mailrc` when the author directory is new, and the ownership
  map when a package is first claimed. A developer release changes no package line.
- **A deletion, an ownership transfer and an author record change are each one write**, a deletion's
  `Retirement` record written in the same transaction; a retention pass is one write however many
  versions it removes, and it runs the same generator as any deletion (`signing-service.md` AC1).
- **Two concurrent publishes** queue on the signing service's per-document transaction lock over the
  documents both invalidate (the index, the repository-level document) and fall back to the
  revision-token retry `data-model.md` makes mandatory (its AC20) where the lock does not cover them
  (`signing-service.md`, "Contention", AC28): both land as two snapshots, never merged into one
  regeneration, and two publishes claiming the same new package land one owner and one `409`.
- **Signing a body at a pointer transition or key rotation** is not a write and creates no snapshot
  (`signing-service.md` AC8, AC9). A proxied repository creates no snapshots.

### What the signing and index service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` cannot be lost, in the
shape `debian.md`, `alpine.md` and `hackage.md` use; that spec lists these as `cpan.md`'s six items
(its "Who depends on this" table) and each is mapped onto its contract below:

1. **An OpenPGP signing key per hosted and per virtual repository**, RSA as PAUSE's subkeys and the
   captured fixture key are ("CPAN RSA", its "Key custody"), verifiable by the gpg of both official
   images (Debian 11 and 13), with its armoured public key and fingerprint in the management
   surface's key listing (its AC12, `gpg --import` byte-checked). Neither the handler nor its
   generator package can reach a private key or import a signature library (its AC2), as
   `write-triggered-services-prototype.md` AC5 asserts for Debian.
2. **Cleartext signing byte-compatible with `CPAN::Checksums`**: the leading
   `0&&<<''; # this PGP-signed message is also valid perl` line, dash-escaping, `Hash: SHA512`, and a
   body ending in `__END__` so the armour sits outside what Perl evaluates, which is the service's
   "OpenPGP cleartext with `CPAN::Checksums`' framing" envelope (its "Key custody"; codec in its Phase
   2); proven by `gpg --verify` in both images, by CPAN.pm 2.38 under `check_sigs`, and by `Safe`
   evaluation in cpanm and CPAN.pm. Every signature is self-checked through
   `artifact-verification.md`'s `openpgp` cleartext entry before the write commits (its AC17).
3. **Generation inside the write**: the generator's `Generate`, dispatched by the pre-commit hook,
   produces the `02packages` body and header, `01mailrc`, and each changed author directory's
   `CHECKSUMS` body, as Design states them, in the same snapshot as the change
   (`write-triggered-services-prototype.md` AC3; `signing-service.md` AC1), with `Affects` naming only
   the index, `01mailrc` when an author directory is new, and the changed directories' `CHECKSUMS`
   (its AC4), deterministic over the same records (its AC25).
4. **Signature records keyed by body digest and key**, produced in the write, at a pointer transition
   for any body the pointer will serve without a current-key signature, and at rotation for every body
   any pointer serves; never on a read; no snapshot: the service's `Signature` record, which it
   generalised from this item (its "Storage", AC6, AC8, AC9).
5. **Rotation with overlap**, through the management API: the new public key is exposed before it
   signs, for an operator-set window (`signing.rotation_window`, default 30 days), and the operator
   documentation tells `check_sigs` users to import it, citing PAUSE's 2027 subkey. The service
   records this as "`dual-signature`'s shape without dual signatures" (its "Rotation profiles"), which
   is not one of its seven named profiles; in effect it is `announce-switch-retire` (announce adds the
   key to the published key set and signs nothing, switch re-signs every served body under the new
   key alone as one atomic batch, retire drops the old key), and naming it so is reported as a sibling
   consequence rather than assumed. Each step is a `configure` operation on the signing-key routes
   (`management-api.md` AC32; `signing-service.md` AC15).
6. **The virtual merge** (Design, "Virtual repositories"): the generator's `Merge`, run as the
   deferred `index.merge` job when a member's documents change, coalesced per virtual, never on a
   request's path, and signed with the virtual repository's key where members share a directory
   (`signing-service.md`, "Virtual merges", AC19).

Verification of an upstream's signature is not the signing service's: it belongs to artifact
verification (`signing-service.md`, "The produce/verify boundary"; Design, "The proxied path").

### Pointers, rollback and freshness

Freshness is the pointer's, and since the foundation wave it is not this handler's to keep.
`data-model.md` owns the record: every pointer carries `moved_at`, set at every transition (a write
advancing the default pointer, a promotion, a rollback, a key switch) to the later of the transition
time and one second after its previous value, so it never moves backwards whatever the clock does,
written only by the transition itself (its "Freshness scoped to the pointer", AC36; the rule this
spec's resolved freshness decision first wrote, which that spec now cites). `signing-service.md` owns
rendering it: every generated file is served through the runtime's `index.ServeDocument`, whose
`Last-Modified` is the record's `moved_at` when that file's bytes changed at the transition and the
previous value otherwise, so it is forward-moving per file, and a conditional request is answered
`304` only when `If-Modified-Since` equals the file's current `Last-Modified` exactly (or
`If-None-Match` equals its byte-derived `ETag`), otherwise the body is sent with a `Last-Modified`
later than anything the client holds (its "Freshness scoped to the pointer: the split with
`data-model.md`", AC11, AC27). An architecture test holds that no handler package sets these headers
or evaluates the conditions itself (its AC11). The exact-match rule also keeps CPAN.pm's own fallback
working: after wget left a zero-length temporary file from a refused host, HTTP::Tiny sent that
file's time as `If-Modified-Since` to the next `urllist` host, and a server answering `304` for any
later date left CPAN.pm with an empty archive and "Checksum mismatch", while an exact-match server
answered `200` and it installed (captured).

`Last-Updated` inside the index stays the snapshot's generation time, so a promoted environment
serves an index byte-identical to the source environment's, and only the HTTP header differs; this
spec therefore qualifies nothing in `data-model.md` AC22 (only headers are pointer-scoped here).

| Transition | Served | `Last-Modified` of generated files | What a client that ran before sees |
|---|---|---|---|
| A write advances the default pointer | The new snapshot's files | Advanced for each changed file | cpm, Carton and cpanm the new index; CPAN.pm after `index_expire` or `reload index` |
| Rollback to an earlier snapshot | That snapshot's files, `Last-Updated` as generated then | Advanced for each file that differs from what the pointer served | The earlier index on cpm and Carton (`200` to their `If-Modified-Since`), cpanm at once, CPAN.pm after its window (captured) |
| Promotion to an environment pointer | The promoted snapshot's files, byte-identical | That pointer's own record | Identical bodies; only the headers differ |
| A deletion | A regenerated index and `CHECKSUMS` | Advanced | The index without the release; its archive answers `404` |
| Serving an older snapshot's file with its original `Last-Modified` | (never done) | (backwards) | `304` to cpm and Carton, which keep the newer index (captured) |

A rolled-back index generated more than thirty days earlier draws CPAN.pm's "This index file is N days
old" warning (source); the operator documentation names it as the accepted cost of keeping bodies
byte-identical, per the resolved freshness decision.

### Deletion, author records and ownership

Per the cross-format precedent (`pypi.md`'s resolved hosted-yank decision, with `npm.md`,
`cargo.md`, `puppet.md` and `hackage.md`), each operation is a completed logical write through the
shared write path, bound onto the kind `management-api.md`'s cross-format reconciliation table
assigns the CPAN rows, carrying that kind's action, hosted only, its trigger verified by integration
tests and its effect by the real clients
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`). **No client in the matrix triggers
any of them but publish**: cpan-upload uploads, and PAUSE's delete page and permission pages have no
client. The handler implements the kinds in `Apply` inside the transaction `Submit` opens, and every
declared kind is driven by a `script` case (`management-api.md` AC24, enforced before any container
starts by `conformance-harness.md` AC26):

| Operation | Effect a client sees | Kind | Action |
|---|---|---|---|
| Publish a release | The archive under its author directory, its `CHECKSUMS` entry, and its package lines where it is the selected release | `publish` (binding: `POST pause/authenquery`) | `push` |
| Delete a release | Its archive answers `404`; the index falls back to the next selected release or drops the package; the directory's `CHECKSUMS` drops the entry; the coordinate is retired | `delete-version` | `delete` |
| Set an author record's name or email | `01mailrc` changes | `annotate` (object `{AUTHOR}`) | `push` |
| Transfer ownership of a package to another distribution | The index follows the new owner's releases | `configure` | admin role |
| Rotate the repository's signing key | New signatures; clients import the key | `configure` on the signing-key routes, applied by `signing-service.md` | admin role |

Rules, applying the precedent: every operation is one snapshot, none for a refused one, and no blob is
deleted directly, so space returns only through retention pruning and `storage-and-gc.md`'s
single-deleter boundary (its AC15; `management-api.md` AC6) holds; the coordinate a `delete-version`
returns in its `Outcome` becomes a core-held `Retirement` record in the same transaction, refused
centrally on every later write for the life of the repository and unaffected by any repoint
(`management-api.md`, "Retirement is core-held", AC12; `data-model.md` AC35); the `Package` row
outlives its versions (`data-model.md` AC33), and ownership stays with the distribution after its
last release is deleted, so a deleted package is not free for another distribution to claim (the
resolved deletion decision below); the ownership map is format state in the repository-level document,
which the retirement record does not replace. A deleted archive is still named by any
`cpanfile.snapshot` that pinned it, and Carton then tries public CPAN at the same path (captured),
which the operator documentation states beside deletion. Ownership transfer is a `configure`
operation whose `Apply` is this handler's, and key rotation a `configure` operation whose `Apply` is
`internal/signing`'s with this format's generator run in the same transaction; both are admin-only,
and no repository-scoped token can perform them (`auth.md` AC30; `signing-service.md` AC15). A
publish or management operation against a remote or virtual repository answers `405` with the
`repository-type` problem (`management-api.md` AC7).

### Names, versions and other traps

- **Nothing folds on the wire.** Package names, distribution names and author IDs match exactly on
  every route, as every client matches (captured). A new package equal under case folding to an owned
  package is refused at publish, since the live index carries no such pair among 261,397 lines.
- **Archive paths parse without a lookup**: `authors/id/{X}/{XX}/{AUTHOR}/{file}`, `{X}` and `{XX}` the
  first one and two characters of the ID, and the file splits at the last hyphen that precedes a
  version, since a distribution word never starts with a digit or `v` followed by a digit. On the
  proxied path an author subdirectory sits between the ID and the file.
- **Versions compare under `version.pm`**, never semver or string order (the comparisons in "The
  index" section); the generator writes versions as declared.
- **Developer releases** (`_` or `-TRIAL`) are stored, fetchable by path and listed in `CHECKSUMS`,
  and never indexed or listed in `history`.

### Authentication

What each client sends, captured over HTTP and over TLS, since they differ:

| Client | Downloads | Upload |
|---|---|---|
| cpanm 1.7049 and 1.7044 (wget) | URL userinfo in `--mirror`, sent as Basic only after a `401` carrying `WWW-Authenticate: Basic`; a `401` without the header ends the run, "Finding Acme::Base () on mirror http://u:********@darkpan/... failed" | none |
| cpm 1.1.5 (HTTP::Tiny) and 0.997024 (curl) | URL userinfo in `--mirror` or the resolver URL, preemptive Basic | none |
| CPAN.pm 2.38 and 2.22 | URL userinfo in `urllist`: over HTTP, HTTP::Tiny preemptive; over TLS both lines fetched through wget, after the challenge; the URL, password included, is printed on every "Fetching" line and stored in `~/.cpan/CPAN/MyConfig.pm` | none |
| Carton 1.0.35 and 1.0.34 (Menlo) | URL userinfo in `PERL_CARTON_MIRROR`, preemptive Basic | none |
| cpan-upload 0.103019 | - | preemptive Basic, `-u` as user and `-p` as password |

How this meets `auth.md`, whose rules this spec does not bend: every client sends the credential as the
Basic password, which its verifier accepts with any username (its AC31), so a registry token is the
password and the user is free, which the binding uses for the author ID. The `401` this format answers
carries `WWW-Authenticate: Basic realm="{repository}"`, because cpanm and CPAN.pm's wget send nothing
without one (captured); it is identical for a private and a missing repository (`auth.md` AC17), a
valid token lacking `pull` answers `404`, and a rejected token answers `401` and is never served as
anonymous (`auth.md` AC12). Plain HTTP is refused before lookup (`auth.md` AC27). Because CPAN.pm
prints and stores the credential, the operator documentation recommends a `pull`-only token for it.
Every form here is the universal Basic password, so `auth.md` needs no new presentation form for
this format; its client table has no rows yet for these five clients, which that spec asks for before
a format's auth cases are written, so the rows above are reported to it as a sibling consequence.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes" there;
`format-handler-interface.md` AC12). The canonical object is `{AUTHOR}/{distribution}/{version}` for
a release, so `ACME/**` confines a credential to one author directory and `*/Acme-*/**` to a family of
distributions.

| Route | Canonical object | Action | Object kind |
|---|---|---|---|
| `modules/02packages.details.txt.gz`, `authors/01mailrc.txt.gz` (they enumerate every package or author) | - | `pull` | none |
| `modules/03modlist.data.gz` (the retired constant: `Modcount: 0` and an empty `data`, naming nothing the repository holds) | - | `pull` | descriptor |
| `authors/id/{X}/{XX}/{AUTHOR}/CHECKSUMS` (it enumerates a directory) | - | `pull` | none |
| `metadb/v1.0/package/{Module}`, `metadb/v1.0/history/{Module}` (a module resolves to a distribution only by lookup) | - | `pull` | none |
| `authors/id/{X}/{XX}/{AUTHOR}/{file}` | `{AUTHOR}/{distribution}/{version}` parsed from the path | `pull` | named |
| `POST pause/authenquery` (the archive part may follow its bytes' neighbours in any order, captured) | - | `push` | none |
| Publish (management API, author and filename given before the bytes) | `{AUTHOR}/{distribution}/{version}` | `push` | named |
| Delete (management API) | `{AUTHOR}/{distribution}/{version}` | `delete` | named |
| Author record (management API) | `{AUTHOR}` | `push` | named |
| Any other route | - (answered `404`) | `pull` | none |

What that gives, applying `auth.md`'s rules rather than re-deciding them. **`03modlist` is a
descriptor** (`auth.md`'s resolved name-free-document decision, was Q23 there), held to that definition
by the sentinel test `format-handler-interface.md` AC12 and `auth.md` AC32 require on every descriptor
route; it is the only one, because every other metadata route names packages, authors or files. **A
patterned `pull` cannot install**: every client reads the index, which reports none, so cpanm, cpm and
Carton fail at the index request and CPAN.pm at `01mailrc`, its first request, under a token patterned
`ACME/**`, the consequence `rpm.md` and `hackage.md` record for their enumerating indexes; a patterned
`pull` still confines a scripted archive fetch.
**A pattern refusal on a named route is answered as absence**, `404`. **A patterned `push` publishes
through the management API**, whose request names the object before the bytes, and **never through the
cpan-upload binding**, whose object is none because cpan-upload orders its parts differently from run
to run, per the resolved binding-object decision below; the binding serves unpatterned `push` tokens.
That makes the binding's `Scope(r)` stricter than what the `publish` operation's `Authorize` reports
for the same release once the archive is committed (`{AUTHOR}/{distribution}/{version}`, from a
bounded peek), so `management-api.md` AC8's "`Scope(r)` equals `Authorize`" does not hold as worded
for this binding; the restatement format batch 3 reported for dput (the route's object among
`Authorize`'s pairs, or a route stricter than its operation) covers it, and this spec's case is
reported beside it.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines on an
**archive route** of either path, the handler answers `403` with `Content-Type: text/plain`, the body
`refused by policy {policy}, rule {rule}: {detail}` (or naming the signal, for a coordinate condemned
under the shared security-signal rule), and a **reason phrase** naming the condition, per the
resolved refusal-rendering decision below. It writes the response through the shared refusal writer
`WriteRefusal`, never a status line of its own (`format-handler-interface.md` AC14), so the status
line is `HTTP/1.1 403 Refused by policy: {condition}`, the condition being the advisory or signal
id, the licence, `stale advisory data` or `unscanned` (ASCII, at most 120 bytes), the one phrase shape
every format shares (`supply-chain-policy.md`, "Rendering a refusal", its resolved
refusal-status-line decision, was Q10 there, AC18); the policy and rule stay in the body, which no
client prints. The reason phrase is the only part any client shows: CPAN.pm prints it through
HTTP::Tiny and wget, cpm writes it to its build log and cpanm shows it under `-v` (captured), and
cpan-upload prints it for a refused publish (source); no client prints the body (captured). HTTP/2
has no reason phrase, so this format depends on the HTTP/1.1 that `deployment.md`'s main listener
speaks by default (`server.http2: false`, its resolved HTTP-version decision, which this spec's
finding prompted, and its AC11, which proves the phrase reaching a real cpanm), and on the operator
keeping a proxy in front client-facing HTTP/1.1, which that spec documents; every client in the
matrix speaks it. Every refused request produces a refusal record naming the coordinate, readable at
`GET /api/v1/repositories/{name}/refusals` (`supply-chain-policy.md` AC5), and clients retry (Menlo
three times, CPAN.pm six times across HTTP::Tiny and wget, captured), so one refused install can
produce several.

**The index keeps naming a refused release**, the no-elision precedent of `conan.md`, `debian.md`,
`puppet.md` and `hackage.md`: eliding it would make the index select an older allowed release silently,
and on a remote the index is the upstream's. Whether the refusal holds is the fallback table's
question: on a hosted or virtual repository it holds for every client configured by the operator
documentation's recipe, and the documented exceptions (Carton, cpanm's history fallback) hold only with
egress restricted. `supply-chain-policy.md`'s table "When a refusal binds, per format" carries this as
the CPAN row, `restricted-egress or client-setting` (its AC20), and `deployment.md` states the egress
precondition as a control on the build fleet ("Refusal enforceability is a deployment precondition")
and generates the operator page from that table.

### Signing, provenance and policy

**CPAN has no author signing that reaches the registry.** A distribution's `SIGNATURE` file is inside
the archive and out of scope; the only signature on the wire is the repository's over `CHECKSUMS`.
So `docs/internal/plans/foundation/artifact-verification.md` is asked for one entry, per
`supply-chain-policy.md`'s resolved verification-ownership decision, and provides it as its
`openpgp` scheme's cleartext entry (its entry table, AC11): **an OpenPGP cleartext verification**
taking an upstream `CHECKSUMS` file and the remote's configured upstream public keys, primary keys
with their subkeys, and answering verified with the signing key's fingerprint, or failed with the
reason (`untrusted-key` for an unknown key, a bad signature, unsigned), treating a signature made
before a key's expiry as gpg does (the MIYAGAWA case verified with exit 0 after expiry, captured).
The keys are the remote's **trust set**, `openpgp` entries (`artifact-verification.md`, "Trust
sets"), administered through `PUT /api/v1/repositories/{name}/trust` (its AC3), filled by operator
import or by that spec's **keyserver import** (`verify.keyserver`, default
`hkps://keyserver.ubuntu.com`, its AC23), which is how PAUSE's keyserver-only 2027 subkey reaches a
remote, and provisioned in a case through the harness's `trust` key (its AC25). The handler reaches
the entry only through the `Verifier` consumer interface in `Deps` (`format-handler-interface.md`
AC15). The verdict source `supply-chain-policy.md` consumes answers, per the resolved
signature-verdict decision below, **verified with chain `repository-chain`** for a proxied archive
whose SHA-256 matched a `CHECKSUMS` entry whose signature verified, and **absent** for a hosted
archive, whose only signature is this registry's own (`artifact-verification.md`, "CPAN, Hackage,
Homebrew", AC11). A rule requiring any verified verdict therefore serves verified proxied archives
and refuses every hosted release, while a rule requiring a publisher identity accepts no
`repository-chain` verdict and refuses every release on both paths (`supply-chain-policy.md` AC15),
which the operator documentation states. The conformance matrix's verification column needs a
passing hosted and a passing proxied verification case for CPAN (`artifact-verification.md` AC24),
which AC25 carries on the proxied path and AC8's `check_sigs` install on the hosted one.

**Advisory coverage is absent from the default feed.** OSV has no CPAN ecosystem (Context), so the
policy engine's coordinate matching finds nothing for a CPAN coordinate, an advisory-dependent rule
attached to a CPAN repository is refused at configuration as `supply-chain-policy.md` requires of an
ecosystem no configured source covers (its AC11, and its coverage table's CPAN row), and the feed
channel of the shared security-signal rule never condemns a CPAN coordinate. **Advisories exist
outside OSV**: the CPANSA feed (2,117 advisories over 434 distributions, keyed by distribution name,
the purl `cpan` name). `supply-chain-policy.md` has since widened its single feed to **one OSV schema
from several sources** (its resolved advisory-sources decision, was Q9, declared through
`policy.feed.sources`), and records why CPANSA still stays out: its advisories are in their own
schema, not OSV's, so CPAN is covered the moment an operator declares an OSV-schema export of CPANSA
as a source, with no change here, and not before (its coverage table: "advisory rules refused at
configuration until an OSV-schema export of CPANSA is declared as a source"). Even then a range
binds only under an ordering that spec's matcher vendors, and its list (semver, PEP 440, Maven, RPM
EVR, Debian, Alpine, opam, Cargo, Go) has no `version.pm` ordering, which is the only correct one here
(`1.1` equals `1.10`); that gap is reported as a sibling consequence. Per the resolved advisory
decision below, this spec adds no converter of its own. Byte-level rules depend on the
shared cataloguer's coverage of Perl distributions, which that spec decides. **No upstream security
signal exists on the CPAN wire**: nothing in the index, `CHECKSUMS` or the author directory marks a
release malicious.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the settled
decisions in `proxy-cache.md`. A remote repository's upstream is any CPAN mirror or DarkPAN base URL,
`https://www.cpan.org/` first. Per the resolved remote decision below, **a remote serves the upstream's
`02packages`, `01mailrc`, `03modlist` and `CHECKSUMS` byte for byte and never re-signs**; nothing in
them names a host (the index header's `URL:` line names `www.perl.com` and no client reads it), and
paths are relative to the base, so no URL is rewritten. That works under a path prefix: cpanm 1.7049 and
1.7044 installed `Try-Tiny` 0.32 through the pass-through at `/cpan/remote/`, and CPAN.pm 2.38 read the
live index and fetched ETHER's 251,610-byte `CHECKSUMS` through it (captured).

Classification and behaviour:

- **`02packages`, `01mailrc`, `03modlist` and every `CHECKSUMS` are mutable metadata**, revalidated
  under the proxy layer's TTL with `If-Modified-Since` and `If-None-Match` (the live files carry both;
  `02packages` is marked `max-age=600`, `CHECKSUMS` `max-age=300`, captured). Their bytes are the
  upstream's, but the `Last-Modified` a remote serves is the cache's own forward-moving `adopted_at`,
  never the upstream's, with `304` only on an exact match, and an upstream revision older than the
  adopted one by upstream `Last-Modified` is not adopted (`proxy-cache.md`, "Freshness of what a
  remote serves", AC22; `data-model.md` AC44), because cpm and Carton revalidate a remote's index as
  they do a hosted one's (Design, "How the clients decide"). The documents are served through the
  same `ServeDocument` helper hosted documents use, with the cache record in place of the pointer's.
- **Archives are immutable artifacts**, fetched on a miss and **committed only when their SHA-256 and
  size match the entry for their filename in the author directory's `CHECKSUMS`**, fetched or
  revalidated first: that entry's SHA-256 is the fetch-and-cache request's **declared digest**, a
  digest obtained through a prior metadata request like any other, so the body is verified while it
  streams (`proxy-cache.md`, "Completion-only mode and the verifier hook", AC20, and its
  stream-and-verify rule, AC10). A truncated or mismatching body is never committed.
- **A path its directory's `CHECKSUMS` does not name answers `404`** after at most one revalidation of
  that `CHECKSUMS`, with no request for the archive, so the remote is not an open relay: it fetches only
  what the upstream lists. That also covers the archives the upstream's index no longer names, which
  `cpanfile.snapshot` pins still request and CPAN keeps in the author directory until the author deletes
  them.
- **The signature verdict** is computed when the remote's trust set holds upstream keys, through the
  `openpgp` cleartext entry, and recorded against the archive's digest after the commit; a failed or
  absent verdict never blocks the SHA-256 gate's commit, because the gate is the integrity check and
  the verdict is policy's input (`proxy-cache.md`: "an integrity call may refuse the commit; a verdict
  is recorded afterwards"), so a PAUSE key rotation the operator has not imported degrades the
  verdict, records it and alerts, and serving continues.
- **The `metadb` routes on a remote** are rendered from the cached upstream index: `package` from its
  line, and `history` from that one line, since the upstream index knows only the newest release; a
  remote has one upstream (`data-model.md` AC16), so it never asks cpanmetadb.
- **Missing archives are negatively cached** with the short TTL; a `429` or `5xx` is never cached as
  absence (`proxy-cache.md` AC9). The operator's "refresh now", `POST
  /api/v1/repositories/{name}/refresh`, marks every cached document and negative entry due for
  revalidation (`management-api.md` AC29; `proxy-cache.md` AC24).
- **Publish and every management operation against a remote repository answer `405`** with the
  `repository-type` problem (`management-api.md` AC7).

The transport is `upstream-adapters.md`'s `https` adapter under the upstream's allowlist and
credential role; the protocol half (which documents to fetch, the gate, the rendering of the
`metadb` routes) stays in this handler. That spec's requirements table carries this format's row, and
each item this spec asked of it is placed:

- **Identity transfer encoding on every metadata request**: `www.cpan.org` answers `CHECKSUMS` with
  `Content-Encoding: gzip` when asked (`vary: Accept-Encoding`, an `ETag` ending `-gzip`, 217,407
  bytes instead of 673,093, captured), and the stored bytes must be the signed bytes. The adapter
  sends `Accept-Encoding: identity` by default, with Go's transparent decompression disabled, naming
  "`cpan.md`'s `CHECKSUMS`" as the reason, and a handler opts in only per request (its "Request
  hygiene", AC5); this handler never opts in.
- **Conditional revalidation** with the upstream's `Last-Modified` and `ETag`: `If-None-Match` and
  `If-Modified-Since` from the held validators, a `304` returned as `NotModified`, validators returned
  verbatim (its AC14, AC15).
- **An optional upstream credential**, the `basic` kind sent preemptively only to the upstream's root
  host, for a DarkPAN upstream behind Basic, over HTTPS unless the operator allows an `http://` root
  (its AC6, AC22).

Upstream removal maps onto `proxy-cache.md`'s event classes ("Upstream removal or replacement"), the
handler classifying and the layer responding, as this format's side of that contract:

| Upstream event, as observed at revalidation or fetch | Class | What this format adds |
|---|---|---|
| An index line changes version or path within the same author directory | Ordinary metadata change | Mirrored by serving the new index |
| An index line moves to another author's directory | Ordinary metadata change, with a divergence recorded | Served, since it is the upstream's index; recorded and alerted as an ownership change, the shape a hijack takes |
| A package disappears from the index | Ordinary metadata change | Its cached archives stay fetchable at their paths while `CHECKSUMS` names them |
| A `CHECKSUMS` entry disappears (the author deleted the file) | Removal with no signal | Cached bytes keep serving |
| A `CHECKSUMS` entry names a different SHA-256 for a cached archive | Immutability violation, revision-bound, the new-blob variant | The route follows the current upstream `CHECKSUMS`, which the clients check against, since an author path carries no digest: the new bytes are fetched and verified as a new blob on the next request, and that commit ends the old blob's cached reference in the same transaction, so the sweep reclaims the old bytes, which no request can be served afterwards (`proxy-cache.md`'s resolved old-blob decision, was its Q20). A remote keeps no superseded `CHECKSUMS`, and a digest one merely names would keep nothing alive (`storage-and-gc.md` AC16); the divergence record keeps both digests |
| A `CHECKSUMS` signature stops verifying under the configured keys | None: a verdict, not an event | The verdict degrades to failed with the reason; serving continues; recorded and alerted |
| An upstream index older than the adopted one | Regression not adopted | The cached index stands |

Per the resolved preconfigured-upstream decision below, no CPAN upstream is preconfigured; the operator
documentation gives the remote for `https://www.cpan.org/` and PAUSE's current keys.

### Virtual repositories

**A virtual repository is possible, and it is the one place a private and a public namespace meet**,
so per the resolved virtual decision below its index is a merge this registry generates, with its own
freshness record and signing key:

- **The merged index is per package, in member order**: the first member whose index names a package
  supplies its line, and later members' lines for it are not merged, the same rule cpanm applies
  across several `--mirror` options (`search_module` tries each mirror's index in turn, source).
- **Reserved namespaces**: the virtual repository's document lists package prefixes (`Acme::`) that
  only hosted members may supply, set as a handler-owned setting of the virtual repository (a
  `configure` change on create or `PATCH`, admin role, `management-api.md`, "The operation
  vocabulary"), so a public `Acme::Base::Extra` a private distribution never
  provided cannot enter the merge; lines from remote members under a reserved prefix are dropped and
  recorded.
- **Archives resolve by path in member order**, the first member holding the file serving it, since the
  index's paths are relative and a client fetches what the merged line names.
- **`CHECKSUMS` pass through from the one member holding an author directory**, a remote's PAUSE-signed
  file included, as the upstream signed it and whatever its verdict, because the archive gate is the
  SHA-256 and the signature is policy's input (Design, "The proxied path"); a directory present in more
  than one member gets a merged body, first member per file, signed with the virtual repository's key.
  A `check_sigs` user of a virtual repository over a remote therefore needs both PAUSE's keys and the
  registry's, which the operator documentation states. `signing-service.md` says a virtual "merges
  only documents whose verdict is verified" from a remote member; read literally, that would drop
  every public author directory of a remote whose trust set holds no PAUSE key, and CPAN.pm would
  then refuse every public install, so this pass-through is reported to that spec as a case its rule
  must admit rather than assumed.
- **`01mailrc` is the union** of members' authors, first member per ID; `03modlist` is the constant.
- **The merge is the generator's `Merge`**, run as the deferred `index.merge` job on `internal/async`
  when a member's documents change (a hosted member's write, or a remote member adopting a new
  upstream index, which is cache materialisation rather than a write and so a trigger
  `signing-service.md` does not yet name, reported as a sibling consequence), coalesced per virtual
  inside `index.virtual_merge_window`, visible within `index.virtual_staleness_bound`, with the
  previous merged set serving until the new one commits and a failed merge leaving it and firing
  `VirtualMergeFailed` (`signing-service.md`, "Virtual merges", AC19; `async-operations.md`'s kind
  table); a virtual created over members has its first merge enqueued at creation. The merged bodies
  are the virtual's current documents, declaring their blob digests as a hosted repository's do.
- **Freshness must move forward at every merge**, so a member's rollback reaches the virtual
  repository's clients as any rollback does: cpm and Carton revalidate the virtual's index as they do
  a hosted one's. A merge creates no snapshot and moves no pointer, so the forward-moving
  `Last-Modified` needs a source the merge advances; the virtual's default pointer's `moved_at`,
  advanced at each merge commit, is the shape `debian.md` asked of `signing-service.md` for its
  virtual `InRelease`, and this format's case is reported beside it.
- **Publish and management operations against a virtual repository answer `405`** with the
  `repository-type` problem.

Multiple `--mirror` options on cpanm and several `urllist` entries on CPAN.pm give users a client-side
union with the same first-wins order, but without reserved namespaces, and Carton's added public
mirrors make its union include public CPAN whatever is configured; the operator documentation
recommends the virtual repository and the fallback recipes together.

### Content negotiation and headers

No route of this format applies a `Content-Encoding`, because every byte is hashed or signed: wget
sends `Accept-Encoding: identity`, HTTP::Tiny and curl send none (captured), and `www.cpan.org`'s
`CHECKSUMS` shows what happens otherwise. Types are `application/x-gzip` for the `.gz` files and gzip
archives, `text/plain` for `CHECKSUMS`, `text/yaml` and `text/plain` for the `metadb` routes, the live
mirrors' choices. Every response carries `Accept-Ranges: bytes`, and archives honour one byte range with
`206`. Generated files and `CHECKSUMS` carry the pointer's `Last-Modified` and a byte-derived `ETag`
with `Cache-Control: no-cache`, all three set by `ServeDocument` from this format's profile and the
pointer's record, never by the handler (`signing-service.md` AC11); archives `Cache-Control: public,
max-age=31536000, immutable`, served from the CAS through the shared read path, which verifies each
archive's digest while streaming and aborts with an operator alert on a mismatch
(`storage-and-gc.md` AC21), the only integrity check cpm and Carton users get. No hosted route
answers a redirect, and every route reaches clients over the HTTP/1.1 the main listener speaks by
default (Design, "Policy refusals on the wire").

### What it needs from Deps

The pinned `Deps` (`format-handler-interface.md`): the CAS, the metadata store at all three levels
with snapshot-pointer resolution, the fetch-and-cache entry point with classification as an argument
and the request shape `proxy-cache.md`'s "Obligation to the handler interface" states (a declared
digest; a re-open input), the central authorizer, and the request logger, with the policy-enforcing
resolution calls returning the typed refusal. Beyond the pin, each now specified by its owner rather
than invented here: the `Verifier` consumer interface for the `openpgp` cleartext entry of
`artifact-verification.md` (`format-handler-interface.md` AC15); `upstream.Options` on
fetch-and-cache for the adapter's allowlist, credential role and encoding (`upstream-adapters.md`);
the refusal writer `WriteRefusal` (`format-handler-interface.md` AC14); and, outside `Deps`, the
optional `Indexer` interface through which `signing-service.md`'s runtime generates, signs and serves
every generated file, rendering the pointer's `moved_at` from `data-model.md` and, on a remote, the
cache-scoped record from `proxy-cache.md`, and the optional `Operator` interface through which
`management-api.md`'s `Submit` reaches `publish`, `delete-version`, `annotate` and `configure`
(optional interfaces held apart until the re-open, `format-handler-interface.md`'s resolved
optional-interfaces decision, was Q10 there).

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available` (below), `Virtual: supported` (the section above) and `Rename: supported`, the four
fields `format-handler-interface.md` AC13 names. Rename is supported because nothing a client reads
names the repository: every path in the index and in `CHECKSUMS` (`cpan_path`) is relative to
`authors/id/`, the `metadb` documents name distribution files by the same relative paths, and the
index header's `URL` line, which no client reads, is written as PAUSE writes it rather than naming
this registry, so a renamed repository serves byte-identical generated bodies, signatures and
archives under its new URL with every `SigningKey` and signature record unchanged and no re-sign
(`signing-service.md` AC29), and the old name answers `not-found` indistinguishably from a
never-existing repository (`repository-lifecycle.md` AC12). A client's `--mirror`, `urllist` or
`PERL_CARTON_MIRROR` must name the new path, which the operator documentation states; a
`cpanfile.snapshot` records paths relative to the mirror, so it survives. `repository-lifecycle.md`
AC12 requires `conformance/cpan/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC32 carries it with the real clients.

### Conformance, the clients and the corpus

Every hosted and proxied case runs on the nine clients unless it names a client-specific behaviour, and
the catalogue counts one ecosystem, the nine appearing in the matrix's Client column under the CPAN
row. **The skew that matters is within each client**: cpanm 1.7044's signature step accepts anything
where 1.7049 has none; CPAN.pm 2.38 requires `cpan_path`, ignores `urllist` under `pushy_https` and
verifies signatures with gpg, where 2.22 does neither; cpm 1.1.5 has `--mirror-only` and HTTP::Tiny
where 0.997024 has neither; and the official 5.30 image has no IO::Socket::SSL, while over TLS both
CPAN.pm lines fetched through wget in the captures.

**Every case runs with the client's network restricted to this registry and its stand-ins**, which
the harness now does for every case: each client container reaches only the hostnames its case
declares (`conformance-harness.md`'s resolved client-confinement decision, was Q6 there, AC23), the
recording session being the one run with egress. The fallback cases (AC22) declare stand-ins
answering as `cpan.metacpan.org`, `backpan.perl.org`, `cpanmetadb.plackperl.org`,
`fastapi.metacpan.org` and `cpan.org` as the `hosts` sub-entries of an `upstreams` entry, resolvable by
those names inside the client container under the harness CA (the same criterion), so a fallback is
observed at the network layer without reaching the internet. The official images are used as published; the cpm, Carton and cpan-upload images are built
from them by the harness and published by digest (`conformance-harness.md` AC4), since no upstream
image carries those tools. CPAN.pm's configuration (`urllist`, `pushy_https` 0, `check_sigs`) is
written by the case `script`, as is the repository's public key for `check_sigs` and `--verify` cases,
read from the server. A hosted case's repository carries the `signing` sub-entry (a fixture key file
or `generate`), and its `state` entries come out generated and signed by the write-path hook with no
seed-side code, byte-identical to a publish of the same content, the public key readable before the
client runs (`signing-service.md` AC21; `conformance-harness.md` AC24); a proxied signature case
declares the remote's upstream keys through the `trust` key (`artifact-verification.md` AC25).

The recorded surface for the replay corpus: against `www.cpan.org`, the index, `01mailrc`,
`03modlist`, one author directory's `CHECKSUMS` and one archive, plus an unknown archive. The reference
implementation for reads is the live CPAN, so `Capabilities()` declares reference-implementation
availability `available`; for publish the reference is PAUSE, which cannot be recorded without an
account, so the binding is proven by cpan-upload alone and the corpus records the upload challenge
only. Recording gates on the harness's redaction criterion (`conformance-harness.md` AC13), whose rule
for this format names the `Authorization` header, URL userinfo and upload bodies. Deliberate divergences
go on the exception list before their flow is expected to replay: this registry's `Written-By`, the
generated `CHECKSUMS` writer line and signing key, pointer-scoped `Last-Modified`, the reason phrase on
refusals, and `405` on remote writes.

## Acceptance Criteria

- [ ] AC1: With the client network restricted to this registry, cpanm 1.7049 and 1.7044 with
      `--mirror {base} --mirror-only` install `Acme::App`, resolving `Acme::Base` to the release the
      index names; the transcript shows the index then one archive request per distribution; and the
      installed module loads.
- [ ] AC2: cpm 1.1.5 with `--mirror {base} --mirror-only` and cpm 0.997024 with
      `--resolver 02packages,{base} --no-default-resolvers` install `Acme::App` with only this registry
      reachable, and the installed modules load.
- [ ] AC3: The core `cpan` client on both official images (CPAN.pm 2.38 and 2.22), configured with one
      `urllist` entry and `pushy_https` 0, installs `Acme::App`; the transcript shows `01mailrc`, the
      index, `03modlist`, each archive and its directory's `CHECKSUMS`; the output shows "Checksum for
      ... ok" for each archive and no index warning (`Line-Count`, `Last-Updated` or age); on images
      without HTTP::Date.
- [ ] AC4: Carton 1.0.35 and 1.0.34 with `PERL_CARTON_MIRROR={base}` install a `cpanfile` requiring
      `Acme::App`, write a `cpanfile.snapshot` whose pathnames and provides match the served index and
      archives, and `carton install --deployment` from that snapshot in a fresh container reinstalls
      it with requests to this registry only.
- [ ] AC5: Every generated index has PAUSE's header fields (`File`, `URL`, `Description`, `Columns`,
      `Intended-For`, `Written-By`, `Line-Count`, `Last-Updated`) with `Line-Count` equal to its package
      lines and `Last-Updated` in RFC 1123 GMT form; lines sorted by package; versions written as declared
      (`v1.2.3` and `undef` included); and each package's line names, among the owning distribution's
      non-developer, non-retired releases providing it, the one with the highest version under
      `version.pm`, so that `1.10` published after `1.9` is selected and `0.10` published after `0.9`
      is not.
- [ ] AC6: With `Acme-Base` owning `Acme::Base`, publishing `Other-Hijack` 9.0 that declares
      `package Acme::Base` answers `409` naming the package and `Acme-Base`, with no snapshot, and the
      index and every client's resolution are unchanged; after an administrative transfer of
      `Acme::Base` to `Other-Hijack` the same publish is accepted and indexed; and a new package equal
      to an owned one under case folding answers `409`.
- [ ] AC7: A developer release (a filename matching `/\d\.\d+_\d/` such as `2.1_01`, or `-TRIAL[0-9]*`
      before the extension such as `1.0-TRIAL`) is stored, listed in its directory's `CHECKSUMS`
      and installable by path with `cpanm ACME/{file}`, and never appears in the index or in `history`;
      a package listed in META `no_index`, a package hidden by a newline after `package`, a package
      absent from a present `provides` map, and a package whose `$VERSION` holds an underscore are
      never indexed; a package whose version the static grammar cannot read is indexed as `undef`; and
      the publish response lists each package not indexed with its reason.
- [ ] AC8: Every author directory holding a file serves a `CHECKSUMS` with the leading
      `0&&<<'';` line, a cleartext signature by the repository's key over a body ending in `__END__`
      that evaluates in Perl to the same hash `CPAN::Checksums` writes for that directory, and one entry
      per file carrying
      `cpan_path`, `md5`, `md5-ungz`, `mtime`, `sha256`, `sha256-ungz` and `size` of the stored bytes;
      `gpg --verify` with the repository's exported key succeeds in both official images; CPAN.pm
      2.38 with `check_sigs` 1 and that key imported installs `Acme::App`; and the signature is a
      `Signature` record keyed by the body's digest, absent from every snapshot's content, the served
      file assembled from body and record with no signing operation on the read.
- [ ] AC9: An archive altered in storage by fault injection is refused by CPAN.pm on both lines with
      "Checksum mismatch for distribution file" and a non-zero exit, and by cpanm 1.7049 and 1.7044
      with `--verify` and Module::Signature installed with "Checksum mismatch", with no altered byte
      installed.
- [ ] AC10: After `Acme-Base` 2.0 is published and every client has installed it, moving the pointer
      back to the snapshot before it serves that snapshot's index with a `Last-Modified` later than any
      the pointer served, equal to the pointer's `moved_at` in `data-model.md`'s freshness record and
      set by `ServeDocument`, never by the handler; cpm 1.1.5 and 0.997024 and Carton, each continuing its previous home, fetch
      it with `200` and resolve 1.1; cpanm resolves 1.1 on its next run; CPAN.pm resolves 1.1 after
      `reload index`, and after its `index_expire` window under an injected clock; a conditional request is answered `304` only when `If-Modified-Since` equals the
      current `Last-Modified` or `If-None-Match` its `ETag`; and no pointer ever serves a generated file
      with a `Last-Modified` earlier than one it served, including with the clock stepped backwards.
- [ ] AC11: Promoting a snapshot to a second pointer serves an index, `CHECKSUMS` bodies, `01mailrc` and
      archives byte-identical to the source pointer's, and every client of the second pointer installs
      from it; after a key rotation every `CHECKSUMS` any pointer serves, including a pointer rolled back
      to a snapshot signed before the rotation, verifies under the new key with gpg; the rotation's
      steps are admin-only `configure` operations on the signing-key routes, the new public key
      published before it signs; and neither the promotion's signing nor the rotation creates a
      snapshot.
- [ ] AC12: A publish through the management API's `publish` kind stores the release in exactly one
      snapshot whose index, `CHECKSUMS` and `01mailrc` reflect it, after which it installs on every
      client, and its `Operation` result lists each package not indexed with its reason; an identical
      republish answers `200` with no snapshot; different bytes at an existing or deleted version,
      including after the deleting snapshot is pruned and after a backwards repoint, a version equal
      under `version.pm` (`1.10` beside `1.1`), and the same distribution version under a second
      author ID each answer `409`, the deleted one refused by the shared write path's retirement check
      before the handler runs; and the same release published through the cpan-upload binding and
      through the API yields byte-identical served documents and snapshot deltas.
- [ ] AC13: `cpan-upload -u ACME -p {token}` with `CPAN_UPLOADER_UPLOAD_URI` set to
      `https://{host}/cpan/{repo}/pause/authenquery?ACTION=add_uri` publishes into `A/AC/ACME` in one
      snapshot and prints "PAUSE add message sent ok [200]", for request bodies with the archive part
      first and last, the archive read from the `pause99_add_uri_httpupload` part; the stored bytes equal
      the file uploaded; a refused upload prints "request failed
      with error code 409" and a reason phrase naming the rule; and a `pause99_add_uri_subdirtext` field
      or a non-empty `pause99_add_uri_uri` answers `400`.
- [ ] AC14: Each of these publishes answers `400` naming the rule, with nothing committed and no
      snapshot: a filename outside the grammar or with another extension; an archive whose entries do
      not share one top directory equal to the filename's stem; a symlink, hard link, device, absolute
      path or `..` path; META `name` or `version` disagreeing with the filename; an author ID outside
      `[A-Z][A-Z0-9-]{1,8}`; and a package name outside the grammar or with non-ASCII characters.
- [ ] AC15: Deleting `Acme-Base` 2.0 through the `delete-version` operation creates one snapshot in which
      the index names 1.1 for its packages, the archive answers `404` and the directory's `CHECKSUMS` no
      longer lists it, and writes its `Retirement` record in the same transaction; every client's next
      resolution installs 1.1; the coordinate stays retired after a backwards repoint and after the
      deleting snapshot is pruned, with no retirement state in any document; and after deleting every
      release the `Package` row survives and another distribution's publish claiming `Acme::Base`
      answers `409`.
- [ ] AC16: Every management operation and the upload binding is refused with no snapshot for a
      principal lacking its action (`push` for `publish` and for the `annotate` author record, whose
      object is `{AUTHOR}` so a `push` patterned `ACME/**` may set `ACME`'s record and not `OTHER`'s,
      `delete` for `delete-version`), answers `405` with the `repository-type` problem against a remote or virtual
      repository, identically through the binding and the API, and ownership transfer and key
      rotation, both `configure`, are refused for every repository-scoped token, including one holding
      every action.
- [ ] AC17: On a private repository over TLS, cpanm on both lines with userinfo in `--mirror` installs,
      the transcript showing each request answered `401` with `WWW-Authenticate: Basic` and repeated with
      `Authorization: Basic`; cpm on both lines and Carton on both lines install with preemptive Basic;
      CPAN.pm on both lines installs, over TLS through wget's challenge response; cpan-upload publishes
      with preemptive Basic; a credential-less request
      answers `401` identically for a private and a missing repository; a token lacking `pull` answers
      `404`; a rejected token answers `401`; plain HTTP carrying a credential is refused before lookup;
      and no credential appears in the registry's logs, error bodies or metrics.
- [ ] AC18: A token holding `pull` patterned `ACME/**` reads `03modlist.data.gz`, a descriptor passing the
      sentinel test, and is refused at the index by cpanm, cpm and Carton and at `01mailrc` by CPAN.pm,
      on both lines, in hosted and proxied mode, while a scripted fetch under it downloads an
      `ACME` archive and answers `404` for an `OTHER` archive, the answer a nonexistent archive gets; a
      token holding `push` patterned `*/Acme-*/**` publishes `Acme-New` through the management API and is
      refused `Other-New` with no snapshot; and a cpan-upload publish is refused for a patterned `push`
      token and accepted for an unpatterned one.
- [ ] AC19: A release the shared policy layer refuses answers `403` on its archive route on the hosted
      and the proxied path with a `text/plain` body naming the policy and the status line
      `HTTP/1.1 403 Refused by policy: {condition}` written by `WriteRefusal`, while the index keeps
      naming it; CPAN.pm prints the reason phrase and exits non-zero, cpm's build log
      carries it, cpanm `-v` prints it; with each client configured by the operator recipe no request
      reaches any other host, asserted at the network layer; and each refused request produces a refusal
      record naming the coordinate.
- [ ] AC20: The `metadb/v1.0/package/{Module}` and `metadb/v1.0/history/{Module}` routes answer in
      cpanmetadb's shapes on hosted, proxied and virtual repositories; with 2.0 indexed, cpm 1.1.5 and
      0.997024 with `--resolver metadb,{base}/metadb/v1.0/,{base} --no-default-resolvers` install
      `Acme::Base@1.1` from this registry only, and cpanm with `--cpanmetadb {base}/metadb/v1.0/` installs
      it after one refused attempt at the `backpan.perl.org` stand-in; and an unknown module answers `404`.
- [ ] AC21: CPAN.pm on both lines installs from a repository whose `01mailrc` lists every author ID
      holding a release and whose `03modlist` is the retired constant, and a repository answering
      either file with `404` is shown by the same client to fail, which is why neither route may ever
      answer `404` on any repository type.
- [ ] AC22: With stand-ins answering as `cpan.metacpan.org`, `backpan.perl.org`,
      `cpanmetadb.plackperl.org`, `fastapi.metacpan.org` and `cpan.org` on the client network, each
      configuration in the operator documentation's recipes (cpanm `--mirror-only`, cpm `--mirror-only` or
      `--resolver 02packages --no-default-resolvers`, CPAN.pm with `pushy_https` 0 and one `urllist`
      entry) sends no request to any stand-in through a refusal, a missing name and a pinned version;
      and each exposure the documentation names (Carton after a `403`, cpanm's default resolution and
      history fallback, cpm's defaults, CPAN.pm's default `pushy_https`) does reach its stand-in, so
      the documentation's warnings are true.
- [ ] AC23: A remote repository over a stand-in CPAN mirror served under a path prefix, and separately
      over the live `www.cpan.org` in the nightly job, serves the index, `01mailrc`, `03modlist` and each
      requested `CHECKSUMS` byte-identical to the upstream's identity-encoded bytes, every upstream
      request carrying no `Accept-Encoding` other than `Accept-Encoding: identity`, and every client
      installs through it with only this registry reachable; the served `Last-Modified` is the cache's
      forward-moving record, never the upstream's, and an upstream index older than the adopted one is
      not adopted; a second install from fresh containers produces no upstream request for any
      archive.
- [ ] AC24: For a proxied archive whose bytes do not match its `CHECKSUMS` entry, or whose body is
      truncated, nothing is committed and the real reason reaches the operator record; a path its
      directory's `CHECKSUMS` does not name answers `404` after at most one `CHECKSUMS` revalidation and
      no request for the archive, asserted at the network layer; an upstream archive `404` is negatively
      cached while a `429` or `5xx` is neither cached as absence nor surfaced as not-found; a refresh
      through the management API makes the next request revalidate every cached document and negative
      entry; a stand-in presenting each removal-table event produces the `proxy-cache.md` event
      class the table names; and a `CHECKSUMS` entry naming a different SHA-256 for a cached archive
      serves every client the new bytes, verified against the current `CHECKSUMS`, and after the next
      sweep past grace the old blob is gone from the store while the divergence record naming both
      digests is still queryable (`proxy-cache.md` AC28).
- [ ] AC25: A remote whose trust set holds an upstream's public keys records `verified` with chain
      `repository-chain` for an archive whose `CHECKSUMS` signature verifies and whose SHA-256 matches,
      and `failed` with `untrusted-key` for a `CHECKSUMS` signed by a subkey the trust set lacks, while
      that archive is still served; after a keyserver import adds the subkey, the next verdict is
      `verified`; a policy rule requiring any verified verdict serves the first and refuses the second
      and every hosted release, naming the reason; and a rule requiring a publisher identity refuses
      all three.
- [ ] AC26: A virtual repository over a hosted and a remote member serves an index merged per package in
      member order, in which a hosted `Acme::Base` shadows the remote's and a remote package under a
      reserved prefix never appears; archives resolve by path in member order; an author directory held
      by one member serves that member's `CHECKSUMS` unchanged and one held by both serves a merged body
      signed with the virtual repository's key, while a remote member's `CHECKSUMS` passes through
      whatever its verdict; every client installs from it with only this registry reachable; a member
      write and a remote member's adopted upstream change become visible in the virtual within the
      staleness bound through the `index.merge` job, never on a request's path; a member's rollback
      reaches the virtual repository's clients as AC10 requires, the virtual's `Last-Modified` moving
      forward at the merge; and publish to it answers `405`.
- [ ] AC27: A hosted repository's generated bodies, referenced through the repository document's
      declared blob-digest list, and a proxied index above the inline metadata threshold survive a GC
      sweep while current or retained and serve every client afterwards, and a generated body no
      current or retained document declares is collected.
- [ ] AC28: An advisory-dependent rule attached to a CPAN repository is refused at configuration naming
      the absent coverage while no configured advisory source declares a CPAN ecosystem, and no CPAN
      coordinate is condemned by the advisory feed.
- [ ] AC29: No response of this format carries a `Content-Encoding`, including to a request sending
      `Accept-Encoding: gzip`; every response carries `Accept-Ranges: bytes`; archives answer one byte
      range with `206`; generated files and `CHECKSUMS` carry `Cache-Control: no-cache`, the pointer's
      `Last-Modified` and a byte-derived `ETag`, archives the immutable caching header; no hosted route
      answers a redirect; and `02packages.details.txt`, `CHECKSUMS.gz`, `MIRRORED.BY` and
      `modules/06perms.txt.gz` (no `06perms.txt` is served) answer `404`.
- [ ] AC30: Replay-match passes against a corpus recorded from `www.cpan.org` covering the recorded
      surface named in Design, with the `Authorization` header, URL userinfo and upload bodies redacted.
- [ ] AC31: Every package, distribution and author ID is matched exactly on every route: `acme::base`
      fails on every client while `Acme::Base` installs, and every index line, path and `CHECKSUMS` entry
      spells names exactly as published.
- [ ] AC32: `Capabilities()` declares proxy `supported`, reference implementation `available`,
      `Virtual: supported` and `Rename: supported`; after a hosted repository is renamed, cpanm, cpm,
      CPAN.pm and Carton configured with the new path install from it, `carton install --deployment`
      from a snapshot written before the rename succeeds, generated bodies, signatures and archives are
      byte-identical with no key re-created or re-signed, and the old name answers `not-found` exactly
      as a never-existing repository does.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/cpan/cpanm_install_test.go` (both official images, network-restricted client containers, transcript order, module load) |
| AC2 | conformance | `conformance/cpan/cpm_install_test.go` (cpm 1.1.5 `--mirror-only`, cpm 0.997024 `02packages` resolver, module load) |
| AC3 | conformance | `conformance/cpan/cpan_client_test.go` (both official images, `urllist`, `pushy_https` 0 written by the case `script`, transcript order, "Checksum ... ok", absence of index warnings) |
| AC4 | conformance | `conformance/cpan/carton_test.go` (both Carton images, snapshot contents compared with the index, deployment reinstall with a network-layer assertion) |
| AC5 | unit + property | `internal/format/cpan/index_gen_test.go` (header fields, sort, declared version strings); `internal/format/cpan/version_order_test.go` (`version.pm` ordering against a table generated in the perl image, including `1.1`/`1.10`, `0.9`/`0.10`, `1.1`/`1.1.0`, `v1.2.3`/`1.002003`) |
| AC6 | integration + conformance | `internal/format/cpan/ownership_test.go` (first-come refusal, transfer, case-folded clash); `conformance/cpan/hijack_test.go` (cpanm resolution unchanged after the refused hijack) |
| AC7 | integration + conformance | `internal/format/cpan/indexing_rules_test.go` (developer releases, `no_index`, newline hack, `provides`, underscore versions, static grammar and `undef`, publish response); `conformance/cpan/dev_release_test.go` (cpanm path install) |
| AC8 | integration + conformance | `internal/format/cpan/index/checksums_gen_test.go` (entries against stored bytes, key order, leading line, body evaluated in the perl image and compared with `CPAN::Checksums` 2.14 output for the same directory, cleartext assembly from the record); `internal/model/signature_record_test.go` (absent from snapshots, `data-model.md` AC37); `conformance/cpan/check_sigs_test.go` (gpg in both images, CPAN.pm 2.38 `check_sigs` install) |
| AC9 | conformance | `conformance/cpan/tamper_test.go` (storage fault injection, CPAN.pm both lines, cpanm `--verify` in the Module::Signature images, exit status and text) |
| AC10 | conformance + integration | `conformance/cpan/rollback_test.go` (warm cpm, Carton, cpanm and CPAN.pm homes, `reload index`); the pointer record and its rendering are `data-model.md` AC36's `internal/model/pointer_freshness_test.go` and `signing-service.md` AC11's freshness tests (exact-match `304`, `moved_at` under an injected clock stepped backwards, no handler setting the headers) |
| AC11 | conformance + integration | `conformance/cpan/promotion_test.go` (byte comparison across pointers, installs); `internal/format/cpan/rotation_test.go` (the rotation through the signing-key routes from the case `script`, signatures under the new key on every pointer, key published before it signs, no snapshot); `internal/signing/rotation_profiles_test.go` (`signing-service.md` AC7, AC8) |
| AC12 | integration + conformance | `internal/format/cpan/publish_test.go` (snapshot counts and contents, idempotent republish, the `409` cases including after pruning and a backwards repoint, the not-indexed list in the result document); `conformance/cpan/publish_install_test.go` (install on every client after a management publish from the case `script`); the binding-equivalence table test of `management-api.md` AC8 enumerating this handler's `Bindings()` |
| AC13 | conformance + integration | `conformance/cpan/cpan_upload_test.go` (cpan-upload publish, printed text, refused upload's reason phrase); `internal/format/cpan/binding_order_test.go` (both part orders, stored bytes, subdirectory and upload-by-URL refusals) |
| AC14 | integration | `internal/format/cpan/ingest_test.go` (one malformed or hostile archive per rule, CAS and snapshot unchanged) |
| AC15 | conformance + integration | `conformance/cpan/delete_test.go` (the `delete-version` operation from the case `script`, index fallback, `404`, client resolution); `internal/format/cpan/retirement_test.go` (the `Retirement` record in the deleting transaction, backwards repoint, pruning, no retirement state in any document, `Package` row and ownership survival) |
| AC16 | integration | `internal/format/cpan/manage_auth_test.go` (action refusals per kind and binding, `405` `repository-type` on remote and virtual through both entry points, `configure` operations refused for tokens holding every action) |
| AC17 | conformance + integration | `conformance/cpan/auth_test.go` (TLS private repository, challenge transcript for cpanm, preemptive Basic for cpm, CPAN.pm, Carton and cpan-upload, anonymous, `pull`-less, rejected and plain-HTTP cases); `internal/auth/leak_test.go` (redaction for this format) |
| AC18 | conformance + unit | `conformance/cpan/pattern_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, both modes, `03modlist` read and every client refused at its first enumerating document, scripted archive fetches, patterned publish through the management API, cpan-upload with patterned and unpatterned tokens); `internal/format/cpan/scope_object_test.go` (the object table per route and the sentinel test on `03modlist` through the shared helper in `internal/format/scope_test.go`, `format-handler-interface.md` AC12, `auth.md` AC32) |
| AC19 | conformance + integration | `conformance/cpan/policy_test.go` (hosted and proxied modes through the `policies` key, admitted because the CPAN binding row is not `pending`, `conformance-harness.md` AC26; reason phrase per client, network-layer assertion under the recipes); `internal/format/cpan/refusal_record_test.go` (a record per refused request, `WriteRefusal` the only writer); `conformance/transport/reason_phrase_test.go` (the phrase through a real cpanm, shared with `deployment.md` AC11) |
| AC20 | conformance + integration | `conformance/cpan/metadb_test.go` (cpm `metadb` resolver on both lines, cpanm `--cpanmetadb` with the backpan stand-in refusing, unknown module); `internal/format/cpan/metadb_render_test.go` (shapes on hosted, remote and virtual) |
| AC21 | conformance | `conformance/cpan/cpan_client_files_test.go` (CPAN.pm on both lines against the served files, and against a stand-in answering `404` for each file to prove the dependency) |
| AC22 | conformance | `conformance/cpan/fallback_test.go` (stand-ins for the five public hosts as `hosts` sub-entries of an `upstreams` entry with the harness CA, `conformance-harness.md` AC23; each recipe and each named exposure, network-layer assertions) |
| AC23 | conformance + integration | `conformance/cpan/proxied_install_test.go` (prefixed stand-in mirror, byte comparison of metadata, upstream request counts, second install with no archive request); nightly `conformance/cpan/live_upstream_test.go` (`www.cpan.org`); `internal/proxy/freshness_test.go` (the cache-scoped record and the regression rule, shared with `proxy-cache.md` AC22) |
| AC24 | integration | `internal/format/cpan/proxied_gate_test.go` (declared-digest mismatch, truncation, unnamed path, operator record); `internal/format/cpan/proxied_negative_test.go` (`404`, `429`, `5xx`, refresh); `internal/format/cpan/removal_test.go` (stand-in presenting each removal-table event, asserting the event class; a changed SHA-256 served as the current bytes, a sweep on an injected clock past grace, the object store and the divergence record read afterwards) |
| AC25 | integration | `internal/format/cpan/signature_verdict_test.go` (trust set through the `trust` key, rotated subkey, keyserver import against a fixture keyserver, verdicts recorded, serving continues); `internal/verify/openpgp/cleartext_test.go` (the entry itself, `artifact-verification.md` AC11); `internal/format/cpan/policy_config_test.go` (any-verified and publisher-identity rules against verified, failed and hosted releases) |
| AC26 | conformance + integration | `conformance/cpan/virtual_test.go` (merged index on every client, shadowing, reserved prefix, member rollback reaching cpm and Carton, a remote member's upstream change, `405`); `internal/format/cpan/index/merge_test.go` (per-package order, path resolution, merged and passed-through `CHECKSUMS`); the `index.merge` contract is `signing-service.md` AC19's |
| AC27 | integration | `internal/storage/metadata_blob_gc_test.go` (declared generated-body blobs and a proxied index across a sweep, then serving; an undeclared body collected; shared with `data-model.md` AC37) |
| AC28 | integration | `internal/format/cpan/advisory_config_test.go` (advisory-dependent rule refused at configuration, no condemnation); the coverage table's CPAN row is `supply-chain-policy.md` AC17's |
| AC29 | integration | `internal/format/cpan/headers_test.go` (every route's encoding, range, type and caching headers, the `404` routes) |
| AC30 | conformance | `conformance/cpan/replay_test.go` (corpus replay against the recorded `www.cpan.org` surface with the named redactions) |
| AC31 | conformance + integration | `conformance/cpan/case_test.go` (lower-case requests on every client); `internal/format/cpan/names_test.go` (exact spelling in index, paths and `CHECKSUMS`) |
| AC32 | unit + conformance | `internal/format/capabilities_test.go` (this handler's four declarations, `format-handler-interface.md` AC13); `conformance/cpan/rename_test.go` (the four installers against the renamed repository, a pre-rename `cpanfile.snapshot`, byte comparison, old name `not-found`; required by `repository-lifecycle.md` AC12) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with type, virtual member order, the reserved
namespaces carried in the repository metadata document verbatim, and the `signing` sub-entry of a
hosted repository; `credentials` (patterned tokens included); `upstreams` (stand-in CPAN mirrors with
variants for a path prefix, removal events, swapped bytes, a rotated signing subkey and
`Content-Encoding` on request, and the five public-host stand-ins as its `hosts` sub-entries);
`trust` for a remote's upstream keys; `state` for pre-published releases, owners, author records and
retired coordinates (`management-api.md`: retirements are seedable); and `advisories` and `policies`.
The two obligations this spec once recorded on the harness are met by the sibling specs: a hosted
`state` entry comes out generated and signed because the write-path hook runs the index runtime on
the seed write too, with no seed-side code (`signing-service.md` AC21; `conformance-harness.md` AC24),
and the public-host stand-ins resolve by their declared names inside the client container
(`conformance-harness.md` AC23). The runner-enforced obligations, both modes and the
unauthenticated, unauthorized and pattern-refusal cases in each, a `script` case per declared kind
and the shared rename case (`conformance-harness.md` AC26), apply from the sibling specs.

## Implementation Phases

### Phase 1: Hosted reads and generated files
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions), its Phases 1 and 2 built (the runtime and the `Indexer` contract, the OpenPGP
  cleartext codec, pointer transitions and rotation) and its Phase 4's seed-path equivalence, and on
  `data-model.md` reaching `planned`
- The format-first mount, the generator package `internal/format/cpan/index`, the generated index,
  `01mailrc`, `03modlist` and signed `CHECKSUMS` with their declared blob list, the archive routes, the
  `metadb` routes, headers and the pointer's `Last-Modified` through `ServeDocument`, seeded releases
  through `state` with the `signing` sub-entry, the per-route addressed objects with the descriptor
  sentinel test, the `403` policy rendering through `WriteRefusal`, `Capabilities()` and the rename
  case (AC32)

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (its Phases 2 and 3:
  publish, `Operator`, bindings)
- The `Operator` interface with `publish`, `delete-version`, `annotate` and `configure`, ingest
  validation and package extraction, first-come ownership, the cpan-upload binding, deletion with
  core-held retirement, author records, ownership transfer and key rotation through the signing-key
  routes, the write-boundary declaration under concurrency

### Phase 3: Pointers and freshness
- Exercises what Phase 1's dependencies already provide: rollback and promotion across pointers,
  exact-match conditional requests end to end, signing at pointer transitions (AC10, AC11)

### Phase 4: Proxied path
- Waits on `upstream-adapters.md` and `artifact-verification.md` (its `openpgp` cleartext entry, built
  here with this format in its Phase 4 at charter step 11) reaching `planned`
- Byte-for-byte metadata with the cache-scoped `Last-Modified`, the `CHECKSUMS` gate on archives as a
  declared digest, the signature verdict against the remote's trust set, negative caching and
  refresh, the removal event classes with the old blob's cached reference ending at the new blob's
  commit, `405` on remote writes

### Phase 5: Virtual repositories
- Waits on `async-operations.md` reaching `planned` (its queue core exists from charter step 4b) and
  `signing-service.md`'s Phase 4 (virtual merges)
- The per-package merge as the `index.merge` job, reserved namespaces, path resolution, merged and
  re-signed shared directories, passed-through remote `CHECKSUMS`, forward-moving freshness at each
  merge

### Phase 6: Corpus, fallbacks and gate
- The recorded corpus against `www.cpan.org`, the public-host stand-ins and the fallback cases, all nine
  clients in the matrix, the exception-list entries named in Design, the matrix's verification column
  (`artifact-verification.md` AC24)

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The seventeen questions this draft raised were each written in the template's decision shape
and then adopted at their own recommendation under the owner's standing delegation of 2026-09-26, so the
loop can continue; each is recorded below as adopted rather than decided, folded through Scope, Design,
the criteria and the Test Plan in the same pass, and reversible by the owner at any time.
`grep -rn "standing delegation"` is the owner's review queue.

### Resolved: where a hosted release's author directory comes from (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the publisher names a
PAUSE-shaped author ID on each publish (`HIDDENNAME` on the binding, a field on the management API); an
ID is created on first use and carries only a display name and email for `01mailrc`; it is a namespace
label, not an identity, and authorization stays `auth.md`'s (Design, "The hosted publish path"; AC12,
AC13, AC14).

The question: every archive path embeds an author directory, clients print it and CPAN.pm requires an
`01mailrc` line for it, and Carton and cpanm fall back to public CPAN by that same path (captured).

**Recommendation:** A. It keeps cpan-upload working unchanged, keeps paths meaningful to people migrating
from PAUSE, and lets an operator choose IDs that are not registered on PAUSE, which the operator
documentation recommends so that a fallback by path finds nothing.

| Option | You get | It costs |
|---|---|---|
| **A. Publisher-named IDs, created on first use** | cpan-upload and existing release tooling unchanged; meaningful paths | Any `push` holder can publish under any ID, which pattern scopes (`ACME/**`) narrow |
| **B. One fixed ID per repository** | No author records | Every path under one directory, one huge `CHECKSUMS`, and cpan-upload's `-u` ignored |
| **C. The ID derived from the principal** | Paths name who published | Tokens and OIDC subjects do not map to nine uppercase characters, and a rename moves paths |

**Why this is yours:** it decides what a Perl user sees as "who published this" and how the fallback
exposure is mitigated.

Accepted cost: author IDs carry no identity; the operator documentation says so and recommends
unregistered IDs.

### Resolved: indexing permissions (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: first-come ownership per package,
keyed to the distribution; a publish of another distribution providing an owned package answers `409`;
transfer is administrative (Design, "The index"; AC6, AC15).

**Recommendation:** A. It closes the captured hijack loudly at publish, and keying to the distribution
rather than to a person fits a registry whose authorization is repository-scoped.

| Option | You get | It costs |
|---|---|---|
| **A. First-come per package, keyed to the distribution, refused at publish** | No distribution can take another's package; the uploader learns why at once | A legitimate package move needs an administrator |
| **B. PAUSE's behaviour: accept, but do not index the package** | PAUSE parity | A silent partial index, which is how a user discovers a problem only at install |
| **C. No permissions, highest version wins (OrePAN2)** | Nothing to manage | The captured hijack |

**Why this is yours:** it decides who may claim a Perl namespace inside a repository.

Accepted cost: the administrative transfer step.

### Resolved: which release an index line names, and developer releases (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: PAUSE's indexing rules within the
owning distribution: highest package version under `version.pm`, developer releases never indexed,
`provides` trusted, `no_index` and the newline hack honoured, underscore versions excluded (Design, "The
index"; AC5, AC7).

**Recommendation:** A. Perl authors release against PAUSE's rules, so the same distribution must index the
same way here, and OrePAN2's divergences (indexing a developer release, numifying `v1.2.3`) were captured.

| Option | You get | It costs |
|---|---|---|
| **A. PAUSE's rules** | Identical indexing to public CPAN | A lower-versioned release is published but not indexed, reported in the response |
| **B. Latest publish wins** | Simpler to explain | A backport release would displace the newer line in the index |

**Why this is yours:** it decides what `cpanm Foo` installs after an unusual release.

Accepted cost: the not-indexed report.

### Resolved: extracting provided packages without running Perl (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: trust a META `provides` map;
otherwise a closed static grammar over `.pm` files outside `no_index`, indexing an unreadable version as
`undef` (Design, "The index"; AC7).

**Recommendation:** A. PAUSE trusts `provides` and evaluates `$VERSION` in Perl; a Go server cannot run
Perl, and `undef` is a legitimate index value (76,039 live lines).

| Option | You get | It costs |
|---|---|---|
| **A. `provides`, else a static grammar with `undef`** | No Perl in the server; every common declaration read | An exotic `$VERSION` expression indexes as `undef` |
| **B. Require `provides`** | Exact data | Refuses every plain MakeMaker distribution (the fixtures had none) |
| **C. Run a sandboxed Perl** | PAUSE's exact results | A Perl runtime inside the server and its sandbox to secure |

**Why this is yours:** it trades exactness on rare declarations for a server with no Perl.

Accepted cost: `undef` for exotic declarations, which the publish response names.

### Resolved: producing and signing CHECKSUMS (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: generate a `CHECKSUMS` for every
author directory inside the write, clearsign it with the repository's OpenPGP key through the signing
service, keep the body as snapshot content and the signature as a signing-service record keyed by body
digest (Design, "CHECKSUMS"; AC8, AC9, AC11).

**Recommendation:** A. CPAN.pm refuses to install without `CHECKSUMS` and refuses a `cpan_path`-less one
(captured), and its `check_sigs` is the only end-to-end check any client makes, so an unsigned file would
leave that option unusable.

| Option | You get | It costs |
|---|---|---|
| **A. Generated and signed** | CPAN.pm installs by default and with `check_sigs`; cpanm `--verify` works | A key per repository, and signing at pointer transitions and rotations |
| **B. Generated, unsigned** | No key management | CPAN.pm with `check_sigs` refuses everything (captured) |
| **C. None** | Nothing to generate | CPAN.pm cannot install at all (captured, exit 2) |

**Why this is yours:** it commits the registry to key custody for a format whose default clients mostly
ignore the signature.

Accepted cost: signing work at every pointer transition and rotation, and a whole-index blob per changed
snapshot, which the retention window bounds. `signing-service.md` generalised this record's
signature placement to every signed format (its resolved signature-placement decision, was Q2 there)
and `data-model.md` holds the `Signature` record (AC37), so nothing here is format-local any more.

### Resolved: making a rollback reach clients (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: generated files carry a
per-pointer `Last-Modified` that only moves forward, and conditional requests match exactly; the index's
`Last-Updated` stays the snapshot's (Design, "Pointers, rollback and freshness"; AC10, AC11).

**Recommendation:** A. It is the smallest change that made the captured rollback visible to cpm and keeps
promoted bodies byte-identical.

| Option | You get | It costs |
|---|---|---|
| **A. Pointer-scoped `Last-Modified`, exact-match `304`** | Rollback visible to every revalidating client; identical bodies across pointers | A pointer-held record, and CPAN.pm's age warning on an old rolled-back index |
| **B. Also rewrite `Last-Updated` per pointer** | No age warning | Promoted indexes differ in bytes, qualifying `data-model.md` AC22 |
| **C. Snapshot-held times** | No model change | cpm and Carton keep the newer index after a rollback (captured) |

**Why this is yours:** it asks the shared model for a pointer-held record on this format's account.

Accepted cost: the pointer-held record, now made (`data-model.md`'s `moved_at`, AC36, rendered by
`signing-service.md`'s `ServeDocument`, AC11, whose freshness rule cites this record), and the
documented age warning.

### Resolved: a route for pinned versions (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every repository serves
cpanmetadb-shaped `package` and `history` routes under `metadb/v1.0/`, rendered from the snapshot, a
remote's from its cached index (Design, "The resolution route"; AC20).

**Recommendation:** A. The index cannot resolve any version below the newest (captured), and both cpanm and
cpm read this shape from a base the user chooses (captured).

| Option | You get | It costs |
|---|---|---|
| **A. Serve the route** | Pinned and ranged requirements resolve against a private repository | cpanm tries backpan first for a non-latest version, which only egress closes |
| **B. Index only** | No extra surface | Pins resolve only by explicit path or a Carton snapshot |

**Why this is yours:** it adds a surface whose most-used client leaks a request to backpan.

Accepted cost: the backpan exposure, stated in the operator documentation.

### Resolved: a PAUSE-shaped upload binding (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `POST pause/authenquery` is a
client binding onto the management API's publish (Design, "The hosted publish path"; AC13).

**Recommendation:** A. cpan-upload, Dist::Zilla and Minilla release through CPAN::Uploader, which reaches
any URI through `CPAN_UPLOADER_UPLOAD_URI` (captured), and OrePAN2's server offers the same binding.

| Option | You get | It costs |
|---|---|---|
| **A. The binding** | Existing release tooling publishes unchanged | A form-shaped route to maintain |
| **B. Management API only** | One publish surface | Every Perl release pipeline changes |

**Why this is yours:** it decides whether Perl authors change their release tooling.

Accepted cost: the binding route.

### Resolved: the addressed object of the upload binding (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the binding reports no object, so
a patterned `push` token cannot use it; the management API's publish reports the release (Design,
"Addressed objects"; AC18).

**Recommendation:** A. cpan-upload orders its parts differently from run to run (captured), so any rule
reading the object from the body would pass or fail by chance.

| Option | You get | It costs |
|---|---|---|
| **A. None on the binding** | Deterministic behaviour | Patterned tokens publish through the management API only |
| **B. Buffer the body and parse before authorizing** | Patterned cpan-upload | Spooling unauthorized uploads |
| **C. The object when the parts happen to come first** | Sometimes works | Nondeterministic refusals |

**Why this is yours:** it decides which uploads a narrow token supports.

Accepted cost: patterned publishing needs the management API.

### Resolved: rendering a policy refusal (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `403` with a `text/plain` body and a
reason phrase naming the policy, over HTTP/1.1, the index unchanged (Design, "Policy refusals on the
wire"; AC19).

**Recommendation:** A. The reason phrase is the only channel any client prints (captured on CPAN.pm, cpm
and cpanm `-v`, and in cpan-upload's source), and eliding from the index would silently select an older
release.

| Option | You get | It costs |
|---|---|---|
| **A. `403`, body and reason phrase** | The reason reaches CPAN.pm, cpm and cpan-upload users | HTTP/1.1 on these routes |
| **B. `403` with a body only** | Standard shape | No client shows the reason |
| **C. Elide from the index** | Resolution picks an allowed release | Silent downgrades; impossible on a remote |

**Why this is yours:** it pins the transport version for one format to make a message readable.

Accepted cost: HTTP/1.1 on these routes, which every client in the matrix speaks, now an instance-wide
default rather than a per-format constraint: `deployment.md` turns `h2` off on the main listener
(`server.http2: false`, its resolved HTTP-version decision), because ALPN negotiates the version
before a route is known, and `supply-chain-policy.md` fixes the phrase shape
(`Refused by policy: {condition}`) and its one writer (its resolved refusal-status-line decision, was
Q10 there), so the policy and rule this record put in the phrase now travel in the body.

### Resolved: what a remote serves (was Q11)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: metadata byte for byte and never
re-signed; archives committed only against the upstream `CHECKSUMS`; a signature verdict from configured
upstream keys that never blocks the SHA-256 gate (Design, "The proxied path"; AC23, AC24, AC25).

**Recommendation:** A. PAUSE's signatures survive for `check_sigs` users of the remote, and a PAUSE key
rotation (captured) degrades a verdict instead of stopping the cache.

| Option | You get | It costs |
|---|---|---|
| **A. Byte for byte, SHA-256 gate, verdict alongside** | Upstream signatures intact; the cache keeps serving through key rotations | Signature-requiring rules fail until the operator imports new keys |
| **B. Gate on the signature too** | Nothing unsigned is cached | Every PAUSE rotation stops the cache |
| **C. Re-sign with the registry's key** | One key for users | Users lose PAUSE's signature, and a remote duplicates a virtual repository |

**Why this is yours:** it decides whether key hygiene or availability wins on the proxied path.

Accepted cost: the operator must track PAUSE's keys for signature rules.

### Resolved: virtual repositories (was Q12)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a per-package, first-member merge
with reserved namespaces that only hosted members may supply, path resolution in member order, and merged,
re-signed `CHECKSUMS` for shared directories (Design, "Virtual repositories"; AC26).

**Recommendation:** A. Per-package order alone lets a public package enter a private namespace the private
distribution never provided; reserved prefixes close that without per-package configuration.

| Option | You get | It costs |
|---|---|---|
| **A. Per-package merge with reserved namespaces** | One URL for private and public, with the private namespace closed | A prefix list to maintain |
| **B. Per-package merge only** | No configuration | Public packages under private prefixes |
| **C. No virtual repositories** | No merge | Users build the union client-side, where Carton adds public CPAN anyway |

**Why this is yours:** it decides how much configuration a dependency-confusion defence costs.

Accepted cost: the prefix list.

### Resolved: advisory coverage (was Q13)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: follow `supply-chain-policy.md`'s
single OSV feed, so advisory rules on CPAN repositories are refused at configuration, and record the CPANSA
feed as evidence for that spec (Design, "Signing, provenance and policy"; AC28). That spec has since
revised the single feed to one OSV schema from several sources (its resolved advisory-sources decision,
was Q9 there, citing this record's evidence), and states why CPANSA still stays out: it is in its own
schema, so CPAN is covered only once an OSV-schema export of it is declared as a source. The outcome
here is unchanged, and the reason is now that spec's, not a single-feed rule.

**Recommendation:** A. A second feed is that spec's decision, not a format's, and OSV has no CPAN data today
(captured).

| Option | You get | It costs |
|---|---|---|
| **A. OSV only; CPANSA recorded** | One feed, one severity model | No advisory rules for Perl |
| **B. Ingest CPANSA here** | Advisory rules for Perl | A second feed and merge semantics the policy spec rejected |

**Why this is yours:** it leaves Perl users without advisory enforcement until OSV or the policy spec
changes.

Accepted cost: the sibling consequence for `supply-chain-policy.md`, now answered by its was-Q9 record
and coverage row, and a remaining one on its matcher, which vendors no `version.pm` ordering.

### Resolved: what deletion means (was Q14)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: deletion removes the release from the
index and its author directory, answers `404`, retires the coordinate, and leaves package ownership with
the distribution (Design, "Deletion, author records and ownership"; AC15).

**Recommendation:** A. A leaked secret must be removable, and keeping ownership stops a deleted package from
being claimed by another distribution.

| Option | You get | It costs |
|---|---|---|
| **A. Remove, retire, keep ownership** | Real removal with no namespace release | Carton snapshots pinning the release fall back to public CPAN by path (captured) |
| **B. Remove and release ownership** | Namespaces free up | A deleted package can be claimed by anyone with `push` |
| **C. Remove from the index only** | Pins keep working | The bytes stay downloadable |

**Why this is yours:** it trades pinned builds against real removal.

Accepted cost: the Carton fallback, stated beside deletion in the operator documentation.

### Resolved: www.cpan.org as a preconfigured upstream (was Q15)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: not preconfigured; the operator
documentation gives the remote and PAUSE's current keys (Design, "The proxied path").

**Recommendation:** A. `proxy-cache.md` AC19 names the preconfigured set, and adding a Tier 3 format there is
a change to that spec.

| Option | You get | It costs |
|---|---|---|
| **A. User-configured** | No change to the shared set | A configuration step |
| **B. Preconfigure `www.cpan.org`** | Zero configuration | A change to `proxy-cache.md`'s criterion and nightly job |

**Why this is yours:** it sets Perl users' first-run behaviour.

Accepted cost: the configuration step.

### Resolved: archive formats and subdirectories on hosted publish (was Q16)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: accept the four extensions the live
index uses (`.tar.gz`, `.tgz`, `.zip`, `.tar.bz2`) and refuse author subdirectories (Design, "The hosted
publish path"; AC13, AC14).

**Recommendation:** A. Those four cover every path the live index names but 31, and a subdirectory adds a
second path for a coordinate that is already unique, which no client resolves differently.

| Option | You get | It costs |
|---|---|---|
| **A. Four extensions, no subdirectories** | Every archive CPAN indexes in practice; one path per release | `cpan-upload -d` users drop the flag |
| **B. `.tar.gz` only** | One reader | 567 live paths' formats refused |
| **C. Subdirectories allowed** | PAUSE parity | Two paths to one coordinate and a longer object grammar |

**Why this is yours:** it decides which existing archives migrate unchanged.

Accepted cost: the `-d` migration note.

### Resolved: case (was Q17)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: exact matching everywhere, and a new
package equal to an owned one under case folding refused at publish (Design, "Names, versions and other
traps"; AC6, AC31).

**Recommendation:** A. Every client matches exactly (captured), and the live index holds no case-only pair
among 261,397 lines, so refusing one costs nothing real and stops lookalikes.

| Option | You get | It costs |
|---|---|---|
| **A. Exact match, case-folded clash refused** | No lookalike packages | A migrated case-only pair cannot both be published |
| **B. Exact match only** | Any name | Lookalike packages |

**Why this is yours:** it decides which package names a private repository accepts.

Accepted cost: the migration note.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | c86fc0a | authoring pass: grounded first draft, not a review | Grounded five ways: captured traffic from cpanm 1.7049 and 1.7044 and CPAN.pm 2.38 and 2.22 on the official perl 5.42 and 5.30 images pinned by digest, and cpm 1.1.5 and 0.997024, Carton 1.0.35 and 1.0.34 and cpan-upload on images derived from them, on dedicated Podman networks against a logging stub serving OrePAN2-built DarkPAN generations with CPAN::Checksums-signed CHECKSUMS (the OrePAN2 package hijack installed by cpanm, the developer release and numified v-string, the OrePAN2 `Last-Updated` crashing CPAN.pm, swapped bytes installed silently by cpanm, cpm and Carton and refused by CPAN.pm and cpanm `--verify`, cpanm 1.7044 accepting bad, missing and absent signatures, CPAN.pm 2.38 `check_sigs` and `cpan_path`, missing 01mailrc, 03modlist and CHECKSUMS, `pushy_https` ignoring `urllist`, rollback masked by `If-Modified-Since` and fixed by exact matching or a forward `Last-Modified`, CPAN.pm's index cache, Basic over HTTP and TLS, reason phrases reaching CPAN.pm, cpm, cpanm and cpan-upload, every client's fallback to public CPAN, the cpanmetadb-shaped history route, cpan-upload's shuffled multipart), plus a byte-for-byte pass-through to the live www.cpan.org; the client sources, PAUSE's operating model and Pinto's stacks; the live CPAN (index statistics, 01mailrc, 03modlist, 06perms, CHECKSUMS signed by PAUSE's expired 2026 subkeys and its keyserver-only 2027 subkey, gzip-encoded CHECKSUMS on request, the upload challenge); MetaCPAN's download_url and cpanmetadb; and OSV (no CPAN ecosystem), CPANSA (2,117 advisories) and purl. Seventeen questions written in decision shape and adopted under the standing delegation: publisher-named author IDs (AC12-AC14), first-come ownership keyed to distributions (AC6, AC15), PAUSE's indexing rules (AC5, AC7), static package extraction with `undef` (AC7), generated and signed CHECKSUMS (AC8, AC9, AC11), pointer-scoped `Last-Modified` with exact-match `304` (AC10, AC11), the cpanmetadb-shaped route (AC20), the cpan-upload binding (AC13) with no addressed object (AC18), `403` with a reason phrase (AC19), byte-for-byte remotes gated on CHECKSUMS with a signature verdict (AC23-AC25), per-package virtual merges with reserved namespaces (AC26), OSV only with CPANSA recorded (AC28), deletion that keeps ownership (AC15), no preconfigured upstream, four archive formats without subdirectories (AC13, AC14), exact case with folded clashes refused (AC6, AC31). Thirty-one criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
| 2026-09-28 | 20ff418 | cross-spec reconciliation of the Wave 1 folds and the foundation wave, on Opus. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying: format-management item 11 and management-api items 11 and 12 (retirement core-held; kinds `publish` with the `POST pause/authenquery` binding, `delete-version`, `annotate` on `{AUTHOR}`, `configure`; `Operator`; `repository-type` and `retired`; the not-indexed list in the result document; AC12, AC15, AC16); signing-service item 11 (freshness is `data-model.md`'s `moved_at` rendered by `ServeDocument`, the resolved freshness record discharged; generator contract and package; `Signature` records, generalised from this spec; per-document lock; the six items mapped onto the contract; AC8, AC10, AC11); upstream-adapters item 12 (`https` adapter, identity encoding AC5, revalidation AC14 and AC15, `basic` to the root host AC6 and AC22); conformance-harness reconciliation items 2 and 4 (public-host stand-ins as `hosts` sub-entries, AC23; seed-path signing through the write-path hook, `signing` sub-entry, AC24; the Test Plan obligations paragraph discharged); supply-chain reconciliation item 10 (CPANSA stays out under was-Q9 because of its schema, the advisory record revised; the `restricted-egress or client-setting` row; AC28); deployment and supply-chain was-Q10 (HTTP/1.1 as the listener default, `WriteRefusal` and the shared phrase shape, the refusal-rendering record revised; AC19); auth was-Q23 (`03modlist` a descriptor; AC18); artifact-verification (the `openpgp` cleartext entry AC11, trust set, keyserver import AC23, `repository-chain` and the publisher-identity nuance; AC25); proxy-cache (declared digests from `CHECKSUMS`, the cache-scoped record and regression rule, event classes, refresh; AC23, AC24); storage-and-gc AC21 read-path verification cited; async-operations (`index.merge`, queue core at step 4b; AC26); repository-lifecycle AC12 and FHI AC13 (Capabilities and lifecycle section, new AC32). No question adopted, `fable_recheck` kept. Found and reported rather than assumed: `auth.md` has no client rows for the five CPAN clients; `management-api.md` AC8's `Scope(r)`-equals-`Authorize` does not hold for this binding, whose object is stricter; `signing-service.md` names no profile for this format's announced rotation, names no remote-adoption merge trigger, gives a virtual no forward-moving freshness at merge, and would drop an unverified remote `CHECKSUMS` from a virtual merge; `supply-chain-policy.md` vendors no `version.pm` ordering. Thirty-two criteria, each with a Test Plan row. `node scripts/check-spec.js` reports no failure in this file. Stays draft; awaits an independent review. |
| 2026-09-28 | 93982ba | data-loss fix on Opus (storage-and-gc closing-sweep item 0): cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied item 0 of "From the storage-and-gc.md closing sweep" in `agents/spec-loop/consequences.md`, verified against `storage-and-gc.md`'s fourth mark root (its third reach, AC16) and `data-model.md` AC34, AC36 and AC45: a digest a document merely mentions keeps nothing alive, the declared blob-digest list is a document's only keep-alive, and a remote writes no content snapshot. The hole: the changed-SHA-256 row said the old blob "stays referenced while a retained revision names it", but a remote keeps no superseded `CHECKSUMS`, a digest one merely names would keep nothing alive, and the route already follows the current `CHECKSUMS` over an author path that carries no digest, so no request could be served the old bytes. Chosen: let it go (proxy-cache was-Q20, AC28): the old blob's cached reference ends in the commit that creates the new one, the sweep reclaims it, and the divergence record keeps both digests. AC24 extended (every client served the new bytes, the old blob gone after the next sweep past grace, the record still queryable); its Test Plan row and Phase 4 updated. No retained revision exists on this remote, so proxy-cache was-Q19 changes nothing here. No new question adopted here; `fable_recheck` extended for the folded decision. `node scripts/check-spec.js`: zero failures on this file. Stays draft. |
