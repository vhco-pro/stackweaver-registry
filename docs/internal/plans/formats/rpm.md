---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the rpm-md wire contract captured from dnf5 5.4.3 (Fedora 44), dnf 4.14 (Rocky Linux 9.8 and RHEL 9.8 UBI), dnf 4.7 (AlmaLinux 8.10), dnf 4.20 (AlmaLinux 10.2) and zypper 1.14.94 and 1.14.101 (openSUSE Leap 15.6, Tumbleweed, SLES 15 SP7 BCI), every image pinned by digest, against a logging stub on dedicated Podman networks serving repositories built and signed with Fedora 44's createrepo_c 1.2.1, rpm-sign 6.0.2 and GnuPG 2.4.9 and Rocky 9's rpm-sign 4.16; checked against the dnf, dnf5 and libzypp configuration references, live Fedora, Rocky, AlmaLinux, UBI and openSUSE mirrors, the Fedora metalink and OSV's ecosystem list. Ten questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for RPM repositories (rpm-md repodata) served to dnf, yum and zypper: repositories holding many trees, each tree's repomd.xml and its primary, filelists, other, updateinfo, comps and modules documents generated and signed by the shared signing service as a write-triggered index, publisher-signed packages whose bytes the registry never alters, the two trust layers kept apart, a proxied path that serves upstream metadata verbatim with its vendor signature, and virtual trees merged and re-signed."
author: michielvha
goal: "Serve RHEL, Fedora, SUSE, Rocky and AlmaLinux hosts a private RPM repository and a verified cache of their distributions' mirrors that stock dnf and zypper install from with gpgcheck and repo_gpgcheck on, credentials only in the repository file, and a network restricted to this registry."
priority: "medium"
issue: 30
created: 2026-09-26
covers:
  - "internal/format/rpm/**"
  - "conformance/rpm/**"
---

# Plan: RPM repositories (dnf, yum and zypper)

The rpm-md repository format, hosted and proxied, on one handler: `repodata/repomd.xml` and the
documents it names, the detached `repomd.xml.asc` over it, and the packages its `primary`
document locates. dnf 4, dnf5 and zypper, on the distributions the catalogue's multiplier row
names, are the oracle on both paths.

## Context

RPM sits in Tier 1 of `formats/catalogue.md` as the row "RPM (yum/dnf)" in the "RPM repodata"
family, whose multiplier row names five distributions (RHEL, Fedora, SUSE, Rocky, Alma). It is
the last format of Tier 1 and of the charter's build step 7 (`project-charter.md`, "Tier 1
remainder, starting with the shared signing and index service"), placed there with Debian
because signed-index formats are the expensive class. Being Tier 1, its build is not gated by
the charter's breadth verdict (AC9 there) or the catalogue's AC5, which bind Tier 2 and Tier 3
only; it is gated by what the build order places ahead of it (Blocking preconditions).

The write-triggered services prototype (`write-triggered-services-prototype.md`) excluded RPM
on purpose, "a good second data point and a bad first one", and chose Debian as its vehicle.
This spec builds on that finding rather than repeating it: the signed index here is generated
and signed by the production service the prototype's finding shapes, and this document states
only what RPM needs of it.

Grounding for this draft, stated up front because the constitution asks for evidence or
silence:

- **Captured client traffic.** This host runs Fedora with dnf5 5.2.18, but the clients were run
  as distribution images pinned by digest so that two client lines and three families could be
  compared: Fedora 44 (`docker.io/library/fedora@sha256:be9d65e2344d805cc11114319c685ecaa96b6d9b4350a0a6460cdb931babbd19`;
  dnf5 5.4.3.0, librepo 1.20.0, rpm 6.0.2 with rpm-sequoia 1.10.2), Rocky Linux 9.8
  (`quay.io/rockylinux/rockylinux@sha256:ed654c694190a670bb5c33f68995b862214fc96ffbdca95e07a8935ba0a3717d`;
  dnf 4.14.0, librepo 1.19.0, rpm 4.16.1.3), Red Hat Enterprise Linux 9.8 UBI
  (`registry.access.redhat.com/ubi9/ubi@sha256:abdef1603c7dd3281d9223b0419e3cc59446e4a8137f2a7ed5cc5bd7da981f8b`;
  dnf 4.14.0), AlmaLinux 8.10 (`docker.io/library/almalinux@sha256:158fba66c3434c58d07fb48cb6f19e3da84a7d9494cb07774d5d36a746136dce`;
  dnf 4.7.0, librepo 1.14.2, rpm 4.14.3), AlmaLinux 10.2
  (`docker.io/library/almalinux@sha256:7b3a2db3971727029b6aed0e6c30ad0f3812229ac5447520acea308cb535800d`;
  dnf 4.20.0, rpm 4.19.1.1 with rpm-sequoia 1.10.1.1), openSUSE Leap 15.6
  (`registry.opensuse.org/opensuse/leap@sha256:a783ee8a37eef5e06dfd44c715ff5a228dfce4328415e5bc5651c9d99a95045d`;
  zypper 1.14.94, libzypp 17.37.18), openSUSE Tumbleweed
  (`registry.opensuse.org/opensuse/tumbleweed@sha256:bc34ab330bd6bc3161ba8f0c4e7d01811b8c70944f0191d068b7dd25f54f2722`;
  zypper 1.14.101, libzypp 17.38.16) and SUSE Linux Enterprise Server 15 SP7 BCI
  (`registry.suse.com/bci/bci-base@sha256:a487b809bb79c405a61bade69958738f14ef31118f5db914afa582498de5ba00`;
  zypper 1.14.101, libzypp 17.38.15). On EL8 and EL9 `/usr/bin/yum` is a symbolic link to
  `dnf-3` in these images, so yum is dnf 4 on the wire and is not a separate client. The stub
  was a logging HTTP and TLS server in a pinned `python:3.13-slim` container
  (`sha256:37134a49d21d2120e4c4d73bb76f8a4ab9aef31f096f7ec2ead48c2feead4332`) on two dedicated
  Podman networks, one `--internal`, answering for `repo.test`, `other.test` and `mirror2.test`
  under a throwaway CA; it recorded every request with its headers, served single and
  multi-range requests, and applied per-path status, host and Basic-credential overrides. The
  fixtures were genuine: seven packages built with Fedora 44's `rpmbuild` (a dependency pair,
  a tilde-and-caret version `1.0~rc1^git1`, a name with `++`, an epoch, an `x86_64` package),
  signed with `rpmsign` 6.0.2 under throwaway RSA-3072 and Ed25519 keys and with a SHA-1
  digest, signed again with Rocky 9's `rpmsign` 4.16.1.3, and gathered into repositories by
  createrepo_c 1.2.1 and modifyrepo_c in gz, xz, bz2, zstd and zchunk forms, with comps,
  updateinfo and modules documents, `repomd.xml.asc` armored and binary, by the right key, the
  wrong key and two keys, and trees deliberately tampered. The stub is not a reference
  implementation; the captures prove what the clients send and how they react.
- **The published contract.** The rpm-md format has no standards-body specification; it is
  defined by createrepo_c's output and the clients that read it, which is why the captures lead
  here. Read this run: the dnf configuration reference (`gpgcheck`, `repo_gpgcheck`,
  `skip_if_unavailable`, `metadata_expire`, `username`, `password`, `sslcacert`, `cost`,
  `priority`), the dnf5 configuration reference (`optional_metadata_types` defaulting to
  `comps,updateinfo`, `zchunk` defaulting to true, `skip_if_unavailable` defaulting to false),
  libzypp's `zypp.conf.LEGACY` on the `gpgcheck`, `repo_gpgcheck` and `pkg_gpgcheck` rules,
  createrepo_c's README and its 1.2.1 `--help`, and Fedora 44's own
  `/usr/share/dnf5/libdnf.conf.d/20-fedora-defaults.conf`.
- **The live upstreams.** `repomd.xml` and its signature and key files fetched from
  dl.fedoraproject.org (Fedora 44 Everything), dl.rockylinux.org (Rocky 9 BaseOS and
  AppStream), repo.almalinux.org (AlmaLinux 9 BaseOS), cdn-ubi.redhat.com (UBI 9 BaseOS) and
  download.opensuse.org (Tumbleweed and Leap 15.6 OSS), with their caching headers, the
  metadata types each serves, the primary sizes, the signature packets, and a package's
  signature tags from Rocky and AlmaLinux; Fedora's metalink for fedora-44; and a package
  request to download.opensuse.org answered by a `302` to a mirror.
- **OSV.** `ecosystems.txt` lists `Red Hat`, `Rocky Linux`, `AlmaLinux`, `SUSE`, `openSUSE`,
  `Azure Linux`, `openEuler`, `Mageia` and `Chainguard`, and no Fedora; a query naming `Fedora`
  answers `invalid ecosystem` (captured 2026-09-26). Detail in "Advisories, OSV and the
  security-signal rule".

Where the documentation and the captures disagree or the documentation is silent, the captures
win, and the differences are recorded because they would otherwise be built from the documents.
dnf5's reference says `skip_if_unavailable` defaults to false, but Fedora ships it set to true
in its drop-in, so a Fedora host silently skips a repository that fails (captured). No reference
says that dnf5 fetches `gpgkey` URLs without the repository's credentials or its `sslcacert`,
which it does (captured). libzypp's own comment states, and the captures confirm, that zypper's
default `gpgcheck` accepts an unsigned package from a signed repository. No reference mentions
that dnf5 refuses a `repomd.xml.asc` holding two signature packets while dnf 4 and zypper accept
it (captured).

Seven things make this format worth a careful spec. **The index is repository-wide and signed**:
`repomd.xml` lists the checksum of every metadata document, `primary` lists the checksum of
every package, and the detached signature over `repomd.xml` certifies the chain, so one publish
regenerates and re-signs a tree. **Two trust layers exist and must not be merged**: the package
signature inside each RPM header (`gpgcheck`) and the metadata signature beside `repomd.xml`
(`repo_gpgcheck`), with different signers, different verifiers and different client defaults.
**The file names are the checksums**, and a client fetches `repomd.xml` and then, seconds or
minutes later, the files it names, so a republish that removes an old file breaks a client
mid-refresh (captured). **zchunk metadata is fetched with byte ranges**, multi-range included,
by dnf5 (captured). **`xml:base` in `primary` sends dnf to another host and dnf 4 sends the
repository's credentials there, even over plain HTTP**, while zypper ignores it (captured).
**The clients disagree on credentials**: dnf sends Basic preemptively on every request, zypper
only after a `401` challenge, and dnf5 never sends credentials to the key URL (captured).
And **a refusal is enforceable only at the package level**: a refused package fails the
install with no fallback to another repository, but a refused `repomd.xml` makes Fedora's dnf5
and zypper skip the repository and resolve from others (captured, Design, "Fallback").

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every
Tier 1 handler (`format-handler-interface.md` AC8), and the write-triggered services
prototype's finding is one of its inputs. This format adds no root-anchored mount: dnf and
zypper take an arbitrary base URL with a path, so everything lives under `/rpm/{repository}/`.

**The shared signing and index service must be `planned` before Phase 1 and built before the
handler reaches `main`.** Every hosted and virtual tree's metadata is a write-triggered signed
document produced by `docs/internal/plans/foundation/signing-service.md` (to be authored in the
spec loop), which the charter builds first in step 7; the charter's AC12 names Helm as that
service's first consumer, and RPM follows it on the same reasoning (sibling consequences). What
this format requires of it is stated in Design ("What the signing and index service must
provide"), never designed here. Hosted reads cannot be tested without it, because a tree with no
generated metadata has nothing for a client to read.

**The management API must be `planned` before Phase 2, and it is the only hosted write path.**
Publishing packages, publishing and withdrawing advisories, setting comps groups and module
metadata, and deleting versions and packages are operations of
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), whose core
the charter builds at step 2 and completes at step 9; no RPM client writes. Phase 1's hosted
reads are testable without it, because the harness's `state` vocabulary seeds packages through
the shared write path, whose seed path must invoke the signing service (sibling consequences).

**The proxied path depends on shared services that are requested, not assumed**: the upstream
adapter behaviour stated in Design ("The proxied path") of
`docs/internal/plans/foundation/upstream-adapters.md` (to be authored in the spec loop, built at
charter step 4), and the verification entries requested of
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop,
built at step 4b). Publish is synchronous (the resolved batch-publish decision below), so
nothing is asked of `docs/internal/plans/foundation/async-operations.md` (to be authored in the
spec loop).

## Scope

**In scope:**

- **The rpm-md read surface** under `/rpm/{repository}/{tree}/`: `repodata/repomd.xml`, its
  detached `repomd.xml.asc`, the key document `repodata/repomd.xml.key`, every metadata document
  `repomd.xml` names (`primary`, `filelists`, `other`, `updateinfo`, `group`, `modules`, and on
  the proxied path whatever the upstream names), and the packages `primary` locates; `GET` and
  `HEAD` on all of them, with single and multi-range requests on every file.
- **Repositories holding many trees** (the resolved tree decision below): a tree is the
  directory a client's `baseurl` names, identified by a path inside the repository, so one
  repository can hold `el9/x86_64`, `el9/aarch64` and `el8/x86_64` as a distribution does.
- **Hosted packages** published through the management API, their bytes stored exactly as
  published, their header parsed into the version document, their placement in a tree declared
  at publish.
- **Generated, signed tree metadata**: on every write that changes a tree, the shared signing
  and index service regenerates `primary`, `filelists` and `other` in gzip, `updateinfo`,
  `group` and `modules` when the tree has them, and `repomd.xml` with unique checksum-named
  files, and signs `repomd.xml` with the repository's key.
- **The two trust layers**: package signatures verified by clients against keys they import
  (`gpgcheck`, `pkg_gpgcheck`), carried by the publisher and never added or altered by this
  registry (the resolved package-signing decision below); metadata signatures verified against
  the repository's key (`repo_gpgcheck`), always produced by this registry for hosted and
  virtual trees.
- **Advisories, comps groups and module metadata** as management operations whose effects the
  clients show: `dnf updateinfo`, `dnf upgrade --security`, `zypper list-patches` and
  `zypper patch`; `dnf group list` and `dnf group install`; `dnf module install` on dnf 4
  (the resolved module-metadata decision below).
- Deleting a version and a package, with the retirement set and the write-boundary declaration
  `data-model.md` requires.
- Name, version, filename and URL rules: case-sensitive names, epoch-version-release-arch
  coordinates, the filename collision the missing epoch causes, and percent-decoding of the
  forms the clients send.
- Non-interactive authentication in the forms the clients send: HTTP Basic from `username` and
  `password` in a dnf repository file, from URL userinfo on dnf and zypper, and from a zypper
  credentials file, with the challenge zypper needs.
- The per-route addressed objects `auth.md`'s pattern scopes evaluate, and the rendering of a
  shared policy refusal on every route.
- **The proxied path** against an upstream mirror root (a Rocky, AlmaLinux, openSUSE, UBI or
  Fedora mirror, or a private one): `repomd.xml` as mutable metadata with a TTL, verified
  against a configured upstream key or a configured metalink before it is served; every file it
  names as immutable, verified against its checksum; packages verified against `primary`;
  upstream metadata and signatures served verbatim; zchunk ranges served from the cache; trees
  whose `primary` carries `xml:base` refused; negative caching; this format's rows of the removal
  table.
- **Virtual repositories**, merged tree by tree with per-name first-member resolution and signed
  with the virtual repository's own key (the resolved virtual-repository decision below).
- Advisory binding through a per-repository OSV ecosystem declaration (the resolved OSV
  decision below).
- The eight pinned clients above as conformance oracles on both paths, with the client network
  restricted to this registry and its stand-ins.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **Any client-side publish protocol.** None exists: dnf and zypper only read. Hosted content
  arrives through `docs/internal/plans/foundation/management-api.md` (to be authored in the spec
  loop). Tools such as `curl -T` to a directory, which Artifactory and Nexus accept, are that
  API's clients, not a wire this handler serves.
- **Registry-applied package signatures.** Signing an RPM rewrites its signature header, so the
  registry would serve bytes the publisher never built and a proxied package could never be
  treated alike; the resolved package-signing decision below records the choice and its cost.
- **zchunk, SQLite and delta-RPM metadata on hosted trees.** Every captured client resolves a
  tree without them (dnf5 falls back from zchunk when `repomd.xml` lists none, captured on the gz
  trees), and none is a trust input. They are served verbatim on the proxied path, where an
  upstream lists them.
- **Metalink and mirrorlist documents served by this registry.** A client pointed at one
  `baseurl` on this registry has no mirror to choose, and a mirror list is the configuration
  that re-opens fallback (Design, "Fallback"). A metalink is consumed as an upstream input only.
- **SUSE's susetags format, `media.1/media` and `content` files.** zypper probes for them
  (captured: `GET media.1/media`, `HEAD content`) and proceeds on `404`; an rpm-md tree needs
  neither.
- **Red Hat's entitled CDN and its client-certificate authentication.** No entitlement was
  available to this run, so that contract is unobserved; UBI's public CDN, which serves the same
  rpm-md format without entitlement, is in scope. A capture reopens it.
- **Yum 3 (EL7) and older createrepo consumers.** EL7 left maintenance in June 2024, and every
  in-support RHEL-family image ships dnf; nothing here is shaped to exclude them, but none is an
  oracle.

## Design

### The wire surface, as captured

Every route hangs off `/rpm/{repository}/`, format-first per `format-handler-interface.md`'s
resolved URL-shape decision; no route is root-anchored. Every URL the metadata names is relative
to the tree (`location href="Packages/..."`, `location href="repodata/..."`), so the handler
never needs the externally visible base URL and never rewrites a document.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Repository metadata | `GET {tree}/repodata/repomd.xml` with `Cache-Control: no-cache` and `Pragma: no-cache` from dnf 4 and dnf5, `User-Agent: libdnf (Fedora Linux 44; container; Linux.x86_64)` (and the matching Rocky, RHEL, AlmaLinux strings), `Accept: */*`. zypper sends `HEAD` then `GET`, `User-Agent: ZYpp 17.38.16 (curl 8.22.0)`, and on first use probes `GET {tree}/media.1/media` (answered `404`). No client sent `If-Modified-Since` or `If-None-Match`: each re-fetches the whole document and compares it with its cache (captured) |
| Metadata signature | `GET {tree}/repodata/repomd.xml.asc` after `repomd.xml` when `repo_gpgcheck` is on (dnf) and by default (zypper `gpgcheck`). An armored signature is accepted by all eight clients, and a binary one by the four dnf clients tried (Fedora 44, Rocky 9.8, AlmaLinux 8.10 and 10.2). A signature holding two signature packets is accepted by dnf 4 and zypper and **refused by dnf5** ("Expected a bare OpenPGP signature, but it's followed by a Signature Packet") |
| Keys | The `gpgkey` URLs from the repository file, fetched when a signature names an unknown key; dnf imports keys into the rpm database with `-y`, zypper with `--gpg-auto-import-keys`, and without either both refuse. zypper also fetches `{tree}/repodata/repomd.xml.key` when the configured key URL fails. A key document holding two armored keys imports both on every client |
| Metadata documents | `GET {tree}/repodata/{sha256}-{type}.xml.{ext}` for each type the client wants: dnf 4 fetches `primary`, `filelists`, `group`, `updateinfo` (and `modules` where listed); dnf5 omits `filelists` (its documented `optional_metadata_types` default); zypper fetches `primary`, `group` and `updateinfo`. No client fetched `other`. gz, xz, bz2 and zstd were each read by Fedora 44, Rocky 9.8 and AlmaLinux 8.10, and gz and zstd by Leap 15.6 and Tumbleweed |
| zchunk | dnf5 prefers `primary_zck` when `repomd.xml` lists it: `Range: bytes=0-255` for the header, then the body, and on a later refresh a **multi-range** request (`bytes=276-392,2896-3382`) for the changed chunks, answered with `multipart/byteranges` (captured). dnf 4 on AlmaLinux 8.10 and Rocky 9.8 ignored the zchunk entries and fetched zstd |
| Packages | `GET {tree}/{location href}`, `User-Agent` as above; dnf percent-encodes `+` as `%2b` and `^` as `%5e` in lowercase hex, zypper sends `+` raw and `^` as `%5E`, and all send `~` raw (captured with `swplus++-1.0-1.noarch.rpm` and `swtilde-1.0~rc1^git1-1.noarch.rpm`) |
| `xml:base` | A `location` with `xml:base="http://other.test/pool/"` sends dnf 4 and dnf5 to that host for the package, dnf 4 carrying the repository's `Authorization` there over plain HTTP; zypper ignores `xml:base` and fetches relative to the tree (captured) |
| Integrity | A metadata document whose checksum disagrees with `repomd.xml` ("Downloading successful, but checksum doesn't match") and a package whose checksum disagrees with `primary` are refused by every client after four attempts on dnf; zypper aborts ("seems to be corrupted during transfer") |
| Credentials | dnf 4 and dnf5 send `Authorization: Basic` preemptively on every request to the repository's URLs (from `username` and `password`, or URL userinfo); zypper sends it only after a `401` carrying `WWW-Authenticate: Basic`, on every request (captured); dnf5 sends no credential to a `gpgkey` URL and ignores `sslcacert` for it |
| Retries | dnf retries a failed download four times (`403`, `404`, `500` and checksum failures alike, captured) and only then fails; zypper does not retry a `403` |

**Error rendering**, captured, because a refusal nobody can read is a refusal nobody can act on:
no client prints a response body on any status. dnf 4 prints "[MIRROR] {file}: Status code: 403
for {url}" four times and "Error downloading packages: ... Cannot download, all mirrors were
already tried without success"; dnf5 prints ">>> Status code: 403 for {url}" four times and
"Librepo error: Cannot download {href}: All mirrors were tried"; zypper on Leap prints
"Permission to access '{url}' denied." and on Tumbleweed "[The requested URL returned error:
403]". A `401` on `repomd.xml` is "Status code: 401" on dnf and "Authentication required but not
provided" on zypper.

### Fallback: what a refusal can and cannot stop

`julia.md` found that Pkg falls back to origin on every refusal, and `terraform.md` found that
Terraform never does. RPM clients sit between the two, and where they sit depends on what is
refused and how the client is configured (captured on Fedora 44, Rocky 9.8 and Tumbleweed):

- **A refused package does not fall back to another repository.** With two repositories
  configured and both listing the same `swhello-1.1-1.noarch`, a `403` on the preferred
  repository's package failed the install on every client; no request reached the second
  repository's copy.
- **A refused package does fall back to another mirror of the same repository.** With two
  `baseurl` entries on one repository, a `403` from the first made dnf 4 and dnf5 fetch the
  package from the second, and zypper fetched it from the second without trying the first.
- **A refused `repomd.xml` makes the repository disappear on Fedora and zypper.** Fedora's
  drop-in sets `skip_if_unavailable = 1`; dnf5 printed "Usable URL not found", skipped the
  repository and installed the package from the other configured repository. zypper printed
  "Skipping repository 'sw' because of the above error" and did the same. dnf 4 on EL, whose
  `dnf.conf` sets `skip_if_unavailable=False`, failed the command.

Three rules follow, and the conformance cases assert them. **A policy refusal is always
package-level**: the tree's metadata never fails because one package in it is refused, so a
refusal can never turn into a skipped repository (the resolved refusal-rendering decision
below). **The recommended configuration names one `baseurl` on this registry**, usually a
virtual tree, with no mirror list; that configuration holds a refusal whatever the client's
egress allows (AC16). **A repository-level failure is not enforcement**: an authentication
failure or an outage on Fedora or zypper hosts silently hands resolution to whatever else is
configured, which the operator documentation states in those words.

### Two trust layers

The captures show the two layers are verified by different code, against possibly different
keys, under different client defaults, so the design keeps them apart end to end.

**Package signatures** live in the RPM's own signature header. A client verifies them before
installing, against keys imported into the rpm database from `gpgkey`:

- dnf 4 and dnf5 with `gpgcheck=1` (Fedora 44, Rocky 9.8, AlmaLinux 8.10) refuse an unsigned package ("Package ... is not signed"; "The
  package is not signed") and one signed by an unlisted key ("Import of key(s) didn't help,
  wrong key(s)?"), all captured.
- zypper's default `gpgcheck` checks the metadata signature and then accepts a package on its
  `primary` checksum alone: an unsigned package from a signed tree installed on Leap 15.6,
  Tumbleweed and SLES 15 SP7, exactly as `zypp.conf.LEGACY` states ("Packages from signed repos
  are accepted if their checksum matches the checksum stated in the repo metadata"). With
  `pkg_gpgcheck=1` it refuses ("Signature verification failed [6-File is unsigned]").
- Key and digest support differs by client line: an **Ed25519** package signature is refused by
  AlmaLinux 8's rpm 4.14 ("Problem opening package") whether rpm 6 or rpm 4.16 made it, and
  accepted by Fedora 44, Rocky 9.8, AlmaLinux 10.2, Leap 15.6 and Tumbleweed; a **SHA-1** digest is refused by Rocky 9 and AlmaLinux 10 ("Hash
  algorithm SHA1 not available"; "SHA1 is not considered secure") and accepted by Fedora 44,
  AlmaLinux 8.10, Leap 15.6 and Tumbleweed. RSA with SHA-256 or SHA-512 is accepted everywhere. rpm 6 on Fedora
  44 writes both the legacy `RSAHEADER` tag and its new `OPENPGP` tag for an RSA key, and only
  `OPENPGP` for Ed25519.
- Every live distribution package inspected carries an RSA/SHA256 header signature by the
  distribution key: Rocky 9 by 702D426D350D275D, AlmaLinux 9 by D36CB86CB86B3716.

Per the resolved package-signing decision below, this layer is the **publisher's**: the
registry stores and serves package bytes exactly as published, verifies them against the
repository's configured trusted package keys through `artifact-verification.md` so policy can
require a verdict, and never signs a package. A hosted repository whose publishers do not sign
is used with `gpgcheck=0` and `repo_gpgcheck=1` on dnf (captured installing on Fedora 44,
Rocky 9.8 and AlmaLinux 8.10, the chain of trust then running from the signed `repomd.xml` through `primary`'s
checksums) and with zypper's defaults.

**Repository metadata signatures** are a detached OpenPGP signature over the exact bytes of
`repomd.xml`, fetched as `repomd.xml.asc`:

- dnf with `repo_gpgcheck=1` refuses an absent signature ("GPG verification is enabled, but GPG
  signature is not available"), a signature by an unknown key ("Signing key not found" on dnf5,
  "Bad GPG signature" on dnf 4), and so does zypper by default ("Signature verification failed
  for repomd.xml", with "is unsigned" or "is signed with an unknown key" first), all captured.
- The signature certifies the whole tree only because `repomd.xml` carries a checksum for every
  document and `primary` carries one for every package; a tampered `primary` is refused on
  checksum by every client (captured). The chain is therefore exactly as strong as its weakest
  checksum, and every checksum this registry writes is SHA-256.
- Upstream distributions sign `repomd.xml` with the **same** key that signs their packages
  (Rocky's `repomd.xml.asc` is by 702D426D350D275D, AlmaLinux's by D36CB86CB86B3716, both
  RSA with a SHA-256 digest; openSUSE's by 35A2F86E29B700A4 with SHA-512), while Fedora and UBI
  serve no `repomd.xml.asc` at all (live, `404`); Fedora's metadata trust is instead the
  metalink, which lists `repomd.xml`'s SHA-256 and SHA-512 (live).

Per the resolved metadata-key decision below, hosted and virtual trees are signed by the shared
signing service with the **repository's** key, and proxied trees serve the upstream's signature
verbatim. A client of a hosted repository whose publisher signs packages therefore lists two
keys in `gpgkey`, the publisher's and the repository's; the operator documentation shows the
repository file.

### Trees: a repository holds many rpm-md trees

A client names a tree, not a repository: `baseurl` is the directory holding `repodata/`, and
distributions lay trees out by release and architecture (live:
`/pub/rocky/9/BaseOS/x86_64/os/`, `/tumbleweed/repo/oss/`). Per the resolved tree decision
below:

- **A repository holds any number of trees.** A tree is identified by its path inside the
  repository, zero or more segments of `[A-Za-z0-9._+-]`, none equal to `repodata`,
  `Packages`, `.` or `..`; the empty path is the repository root. The path is declared by every
  publish, so `el9/x86_64` and `el9/aarch64` in one repository are two independently generated
  and signed trees, and a client's `baseurl` of
  `https://host/rpm/internal/el$releasever/$basearch/` resolves per host.
- **A hosted tree's layout is fixed**: metadata under `repodata/`, packages at
  `Packages/{filename}`. A request path splits at the first `repodata` or `Packages` segment; what
  precedes it is the tree.
- **A remote repository's trees are the upstream's**: a request path under a remote resolves to
  the longest prefix whose `repomd.xml` this registry has fetched, and the remainder must be a
  file that tree's `repomd.xml` or `primary` names (below).
- **Architectures are not segregated by the server.** A tree may hold `noarch`, `x86_64` and
  `src` packages together, as createrepo_c produces; the client filters by its architecture.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- **A `Package` is `{tree}/{name}`** (or `{name}` for the root tree), with the RPM name exactly
  as the header gives it: names are case-sensitive, and Fedora 44, Rocky 9.8, AlmaLinux 8.10 and Tumbleweed all refused
  `SWHELLO` for `swhello` (captured).
- **A `Version` is `{epoch}:{version}-{release}.{arch}`**, the epoch always written, `0` when
  the header has none, the form OSV's RPM ecosystems use for fixed versions (1:3.0.7-24.el9,
  live). Its document holds the parsed header fields the index needs (the package-level fields
  `primary` carries: summary, description, URL, licence, vendor, group, build host, source RPM,
  header range, times and sizes, the `provides`, `requires`, `conflicts`, `obsoletes`,
  `recommends`, `suggests`, `supplements` and `enhances` lists with their flags and versions),
  the file list `filelists` carries, the changelog entries `other` carries, the file's SHA-256
  and size, and the signature facts (key id, algorithm, digest) the verifier reported.
- **`File`**: one per version, `Packages/{filename}`, keyed by CAS digest.
- **The package-level document** holds the retirement set of deleted versions.
- **The repository-level document** holds, per tree, the generated document set (each
  document's digest, type, checksum, open checksum and sizes, and `repomd.xml` and its signature
  as digests), the tree's advisories (the `updateinfo` entries), its comps groups and its module
  documents, plus the repository's key reference and, when declared, its OSV ecosystem. The
  documents themselves are CAS blobs referenced from it, protected by the fourth GC mark root
  (`storage-and-gc.md` AC16), because a tree's `primary` crosses any sensible inline threshold
  (live: Fedora 44 Everything's is 15.7 MB compressed, Rocky 9 BaseOS's 32.5 MB).
- A remote repository's document holds, per tree it has served, the current and retained
  `repomd.xml` revisions, their verification results, and the location index built from each
  `primary` (below); none of it is snapshot content.

### The hosted publish path and what counts as a write

Nothing on any RPM wire writes. The hosted path is fed by the registry-owned management API,
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop). Per the
cross-format precedent (`pypi.md`'s resolved hosted-yank decision, with `npm.md`, `cargo.md`,
`hex.md`, `cran.md`, `julia.md` and `terraform.md`), each operation is one completed logical
write through the shared write path, authorized in the settled `(repository, action)` vocabulary
with no new action, hosted only, its trigger verified by this registry's integration tests and
its effect by the real clients (`docs/internal/analysis/management-surfaces-and-the-oracle.md`:
RPM is a format none of whose management triggers has a client). What this format **requires**
of that API, stated rather than designed:

| Operation | What the operation carries | Effect a client sees | Action |
|---|---|---|---|
| Publish packages | A tree path and one or more RPM files (the resolved batch-publish decision below) | Every package appears in the tree's `primary` and installs after the client's next metadata refresh | `push` |
| Delete a version | Tree, name and EVRA | It leaves `primary`; installing it fails; its package route answers `404`; the coordinate is retired | `delete` |
| Delete a package | Tree and name | Every version leaves and is retired; the `Package` row survives (`data-model.md`, "A package outlives its versions") | `delete` |
| Publish or replace an advisory | Tree and one `updateinfo` `update` element (id, type, severity, dates, references, package list) | `dnf updateinfo list` and `info`, `dnf upgrade --security`, `zypper list-patches`, `zypper info -t patch` and `zypper patch` show and apply it (captured on dnf 4, dnf5 and zypper) | `push` |
| Withdraw an advisory | Tree and advisory id | It leaves `updateinfo` | `delete` |
| Set comps groups | Tree and a comps document | `dnf group list` shows the group and `dnf group install` installs its mandatory packages on dnf 4 and dnf5 (captured); zypper does not read comps groups as patterns (captured) | `push` |
| Set module metadata | Tree and a modulemd document set | `dnf module list` shows the stream on dnf 4 and dnf5; `dnf module install` installs a profile on dnf 4 (Rocky 9.8, AlmaLinux 8.10); dnf5 has no `module install` (captured: "Unknown argument") | `push` |

What this registry enforces on ingest:

- The body is spooled to a bounded temporary buffer outside the CAS. Each file must parse as an
  RPM (lead, signature header, header) whose header digests and payload digest verify through
  the entry requested of `artifact-verification.md`, with a name, version, release and
  architecture present; a file that does not is refused with `422`, nothing committed.
- The stored filename is the canonical `{name}-{version}-{release}.{arch}.rpm` from the header,
  whatever the upload called it. **The canonical filename carries no epoch**, so two packages
  differing only in epoch would share a `location href`: the second is refused with `409` naming
  the first.
- **A coordinate that already exists in the tree is refused with `409`** unless the bytes are
  identical, which is idempotent and creates no snapshot, the CI-retry case; so is a retired
  coordinate, with any bytes, including after the deleting snapshot has been pruned: the
  cross-format retirement rule.
- An advisory naming a package the tree does not hold, a comps group whose mandatory package is
  absent, or a module whose `artifacts` name a NEVRA the tree does not hold is refused with
  `422`; the module case matters because dnf 4 hides non-modular packages of a name an enabled
  module claims (captured: enabling `swmod:1` installed the module's `swhello-1.0` although
  `1.1` was present).
- The version document records the signature the verifier reported; whether an unsigned package,
  a key outside the repository's trusted package keys, an Ed25519 key or a SHA-1 digest is
  refused is a repository policy rule over that verdict (`supply-chain-policy.md`, "Signature
  and attestation state is a consumed verdict"), and the operator documentation names which
  client lines refuse which.
- A publish or management operation against a remote or virtual repository answers `405`.

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. RPM's
declaration:

- **One publish is one completed logical write**, however many packages it carries, together
  with the regeneration and re-signing of the tree it targets, in one snapshot.
- **Each deletion is one write** however many versions it removes, the retirement set updated in
  the same write; a retention pass over a repository is one write.
- **Each advisory, comps or module change is one metadata write** with the tree's
  regeneration.
- A proxied repository creates no snapshots; `repomd.xml` revisions, documents and packages
  arriving from an upstream are cache materialisation.

### Every hosted tree's metadata is a write-triggered signed index

Per the resolved metadata-key decision below, a tree's documents are produced by the shared
signing and index service inside the write that changes the tree, **stored, never rendered on
request**, exactly the class `write-triggered-services-prototype.md` defines for Debian's
`Release`. The rules the service applies for this format, stated as this format's requirements:

- **Regeneration inside the write.** A publish, deletion, advisory, comps or module change
  regenerates the affected tree's document set and `repomd.xml`, and signs it, in the same
  snapshot as the change (`data-model.md`'s one-write-one-snapshot rule; the prototype's
  question 3). No other tree is touched, so writes to different trees never contend.
- **Under contention, both land.** Two concurrent publishes into one tree each produce a
  `primary` that lists the other's packages once both are complete, through the revision-token
  retry `data-model.md` makes mandatory, applied by the service.
- **Unique, checksum-named files, and every earlier revision still fetchable.** A client fetches
  `repomd.xml` and then each file it names, and a file missing at that moment fails the refresh
  on every client (captured: a `repomd.xml` naming absent files made dnf 4 fail, dnf5 skip the
  repository and zypper report "not found on medium"). A repodata file is therefore served by the
  digest its name carries from any snapshot the repository retains, and a file named by an
  earlier `repomd.xml` stays fetchable after a later publish; the route is content-addressed in
  that sense, though it enumerates names (the addressed-object table below).
- **`repomd.xml` is served with `Cache-Control: no-cache`** and a byte-derived `ETag`, and every
  checksum-named file with `Cache-Control: public, max-age=31536000, immutable`. No client
  sends a conditional request (captured), so the headers serve intermediaries rather than the
  clients.
- **A repoint restores the documents.** The tree set lives in the repository-level document, so
  a rollback serves exactly the signed trees of the snapshot it targets; a pointer moved
  backwards across a deletion must preserve the retirement set (`data-model.md` AC33's obligation
  on the management surface).

### What the signing and index service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` (to be authored
in the spec loop) cannot be lost, and precisely enough that the service can be specced against
it:

1. **Generation of a tree's rpm-md document set** from the version-level records of every
   package in the tree and the tree's advisories, comps and modules: `primary`, `filelists` and
   `other` as createrepo_c 1.2.1 renders them field for field, gzip-compressed; `updateinfo`,
   `group` and `modules` when present; and `repomd.xml` with, per document, its SHA-256
   `checksum` and `open-checksum`, `size` and `open-size`, `timestamp` and a `location href` of
   `repodata/{checksum}-{type}.{ext}`, plus a `revision`. No `xml:base`, no SQLite, no zchunk.
   gzip because all eight captured clients read it (the gz trees behind every basic install);
   xz, bz2 and zstd were read by every client tried, so the choice costs nothing.
2. **One OpenPGP key per hosted and per virtual repository**, RSA of at least 3072 bits, and a
   signing operation over `repomd.xml`'s bytes returning an **armored** detached signature with
   **exactly one signature packet** and a SHA-256 or stronger digest. One packet, because dnf5
   refuses two (captured); armored, because it is the form every live upstream serves; RSA,
   because it is the key type every inspected upstream uses and all eight clients verify it.
   The handler never sees the private key, which an architecture test asserts as
   `write-triggered-services-prototype.md` AC5 does for Debian.
3. **The key document**: the armored public key block of every key currently valid for the
   repository, concatenated, served as each tree's `repodata/repomd.xml.key` and shown in the
   management surface with its fingerprint, since a user's `gpgkey` points at it.
4. **Synchronous regeneration and signing inside the write**, within a management request's
   latency budget; there is no asynchronous half.
5. **Contention handling and storage** as in the section above: the revision-token retry, CAS
   storage above the inline threshold, byte-derived `ETag`s, and retention of every file an
   unpruned snapshot's `repomd.xml` names.
6. **Rotation.** After a rotation every tree's current `repomd.xml` is re-signed by the new key in
   one write, and the key document lists old and new keys for a rotation window. A client whose
   repository file points `gpgkey` at the key document and runs with `-y` or
   `--gpg-auto-import-keys` imports the new key and continues; without them dnf and zypper refuse
   until a human accepts (captured on dnf5, dnf 4 and zypper). Rotation is therefore visible to
   interactive users and invisible to unattended ones, which the operator documentation states.
   A dual signature is not a way round this, because dnf5 refuses it (item 2).
7. **The virtual merge** (below), re-run when a member's tree changes, and signed with the virtual
   repository's key.

Verification of upstream signatures is not the signing service's: it belongs to artifact
verification.

### What artifact verification must provide

Of `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop),
per `supply-chain-policy.md`'s resolved verification-ownership decision:

1. **An OpenPGP detached-signature verification entry** that takes `repomd.xml`'s bytes, the
   signature and an upstream's configured key set, and answers verified (with the key id) or
   failed, accepting armored and binary signatures as the captured dnf clients do.
2. **RPM package verification**: the header and payload digests of an RPM, and its header
   signature against a key set (the repository's trusted package keys on the hosted path, the
   upstream's vendor keys on the proxied path), answering verified, failed or absent with the key
   id, key algorithm and digest algorithm, so policy can refuse SHA-1 or Ed25519 as a rule rather
   than the handler hard-coding one client line's limits. The RPM header parsing this needs is
   format knowledge the verifier owns, as `supply-chain-policy.md` anticipates for every
   format-entangled signature.
3. **Metalink checking**: the SHA-256 or SHA-512 a metalink document lists for `repomd.xml`,
   compared with the fetched bytes, for upstreams whose trust is a metalink rather than a
   signature (Fedora, live).

### Names, versions, filenames and URL encoding

- **Nothing folds.** RPM names and versions are compared byte for byte; `SWHELLO` resolved to
  nothing on dnf 4, dnf5 and zypper (captured on Fedora 44, Rocky 9.8, AlmaLinux 8.10 and
  Tumbleweed, each suggesting `swhello`). The addressed object
  and the package name keep the header's spelling.
- **Versions are RPM's**, not semantic versions: `~` sorts before the release it precedes and
  `^` after (the fixture `1.0~rc1^git1` installed on every client); ordering is the client's
  (`rpmvercmp`), and the registry never sorts for resolution. The registry compares versions
  only for equality.
- **Percent-decode every path before lookup, and never decode `+` as a space.** dnf sends
  `swplus%2b%2b-1.0-1.noarch.rpm`, zypper `swplus++-1.0-1.noarch.rpm`, and both must resolve;
  `%5e` and `%5E` both mean `^` (captured).
- **Location hrefs may climb.** An upstream `primary` may name a file outside the tree's
  directory (`../`); the handler resolves it against the tree and refuses any result outside the
  remote repository's root, so a hostile `primary` cannot make this registry fetch an arbitrary
  upstream path.

### Authentication: Basic, preemptive on dnf, challenged on zypper

Both families send HTTP Basic, which `auth.md`'s verifier accepts with the token as the password
and the username not an input; the client table needs `dnf` and `zypper` rows (sibling
consequences). How this meets `auth.md`, whose rules this spec does not bend:

- **The forms.** dnf reads `username` and `password` from the repository file or userinfo in
  `baseurl`; zypper reads userinfo or a credentials file named by `?credentials=` (captured, all
  three working). The operator documentation uses `__token__` as the username.
- **The challenge is required.** zypper sends nothing until a `401` with
  `WWW-Authenticate: Basic realm="..."` (captured: every zypper request was first answered `401`
  and then retried with the credential). A credential-less request to a repository that is not
  anonymously readable therefore answers `401` with that header, identically for a private and a
  missing repository (`auth.md` AC17); a valid token lacking `pull` answers `404`; a rejected
  token answers `401` and is never served as anonymous (`auth.md` AC12).
- **Keys on a private repository.** dnf5 fetches `gpgkey` URLs with no credential and without
  the repository's `sslcacert` (captured: `401` four times, then a TLS verification failure with
  the CA only in `sslcacert`). Per the resolved metadata-key decision below the key document is
  not carved out of authorization, so on a private repository a dnf5 host installs the key from a
  `file://` URL provisioned with the repository file (captured working) or trusts the CA
  system-wide; dnf 4 and zypper fetch it with the credential (captured).
- **No credential leaves for another host.** Hosted and virtual metadata never carry
  `xml:base`, and a proxied tree whose `primary` does is refused (below), because dnf 4 sent
  `Authorization` to the `xml:base` host over plain HTTP (captured).
- **TLS.** `auth.md` requires TLS for credentials; dnf takes the CA from `sslcacert` or the system
  store and zypper from the system store (captured with the harness CA installed through
  `update-ca-trust` and `update-ca-certificates`).

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). The canonical object of a package is
`{tree}/{name}/{epoch}:{version}-{release}.{arch}`, the tree segments first (none for the root
tree); the tree is everything before the last two segments.

| Route | Object kind | Canonical object |
|---|---|---|
| `repomd.xml`, `repomd.xml.asc`, `repomd.xml.key` | none | - |
| Any `repodata/` document (it enumerates the tree's names) | none | - |
| A package (hosted `Packages/{filename}`, or a proxied location) | named | `{tree}/{name}/{evra}` of the package the path resolves to |
| zypper's probes (`media.1/media`, `content`) | none | - |
| Publish packages (management API) | named | each file's `{tree}/{name}/{evra}` from a bounded peek at its header, which precedes its payload; a publish carrying several files is authorized only if every object is |
| Delete a version (management API) | named | `{tree}/{name}/{evra}` |
| Delete a package (management API) | named | `{tree}/{name}` |
| Advisory, comps and module operations (management API) | none | - |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. **A patterned
`pull` cannot install anything**: a client must read `repomd.xml` and `primary`, which report
none, so dnf and zypper fail at the first request under a token patterned `el9/swhello/**`; this
is the Cargo consequence without a way out, because the index is one document per tree, and
it is recorded rather than worked round, since widening a patterned read to the whole index
would reveal names outside the pattern. A patterned `pull` still confines a scripted `curl` to
in-pattern packages. **A patterned `push` publishes** in-pattern packages and is refused an
out-of-pattern one with no snapshot, and a patterned `delete` likewise; advisory, comps and
module changes need an unpatterned grant, because each can change what every package in the tree
resolves to.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on the
package route of either path, the handler answers `403` with a JSON body
`{"errors": [{"status": "403", "title": "...", "detail": "..."}]}` naming the policy and rule,
and nothing else changes: the tree's metadata still lists the package and still verifies. Per the
resolved refusal-rendering decision below and captured on every client: dnf retries four times
and fails with "Status code: 403 for {url}", zypper fails with "Permission to access ... denied"
or "returned error: 403", no client prints the body, and the install exits non-zero. The
refusal's explanation therefore reaches the operator through the transcript and the refusal
record, and one install attempt produces four refused requests on dnf, which the refusal record
coalesces by coordinate and principal rather than counting as four events.

A metadata route never answers a policy refusal: `repomd.xml` and the documents it names are the
repository as a whole, and refusing them turns enforcement into a skipped repository (Design,
"Fallback").

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`. The upstream is a mirror root (for example
`https://dl.rockylinux.org/pub/rocky/`), and a client path under the remote repository is
appended to it. Per the resolved proxied-metadata decision below, **upstream metadata and
signatures are served verbatim**, so a client keeps its stock distribution key: Rocky and
AlmaLinux sign `repomd.xml` and packages with one key (live), which a Rocky host already has.

What this format requires of `docs/internal/plans/foundation/upstream-adapters.md` (to be
authored in the spec loop):

- **Path joining under a mirror root**, with the remote's optional upstream credential (Basic)
  forwarded to that root's host only.
- **Cross-host redirects to an allowlist**: download.opensuse.org answers a package request with
  `302` to a mirror (live), so the adapter follows redirects to hosts on a per-remote artifact
  allowlist and forwards no credential beyond the root host.
- **Conditional revalidation** of `repomd.xml` with `If-None-Match` and `If-Modified-Since`:
  every upstream sampled sends `ETag` and `Last-Modified` (live), and their freshness hints
  differ (`Cache-Control: public, max-age=60` on repo.almalinux.org, `max-age=600` on the UBI
  CDN, `max-age=240` with `stale-if-error=86400` on download.opensuse.org, none on
  dl.fedoraproject.org and dl.rockylinux.org).
- **A metalink fetch** for a remote configured with one, fetched over TLS from its configured
  host, whose listed hash is checked through the verification entry above.
- **Range pass-through is not required**: a miss fetches the whole file, and ranges are served
  from the CAS once it is committed.

Classification and behaviour:

- **`repomd.xml`, `repomd.xml.asc` and `repomd.xml.key` are mutable metadata with the proxy
  layer's TTL.** A new revision is fetched with its signature and verified before it is served:
  against the remote's configured upstream keys when set (Rocky, AlmaLinux, openSUSE), against
  the configured metalink when set (Fedora), and otherwise accepted on TLS alone, which the
  remote's configuration records as unverified. A revision that fails is never served; the
  previous verified revision keeps serving under serve-stale and the operator is alerted.
- **Every file a verified `repomd.xml` names is an immutable artifact**, verified under
  stream-and-verify against the checksum `repomd.xml` gives (SHA-256 on the Red Hat family,
  SHA-512 on openSUSE, live), and served thereafter with single and multi-range support, so
  dnf5's zchunk deltas work against a cached Fedora tree. Files named by retained earlier
  revisions stay servable exactly as on the hosted path.
- **A location index per `primary`.** A package can be verified only against the checksum and
  size `primary` gives it, so the first package request under a revision builds, once per
  `primary` digest, an index from `location href` to checksum, size and NEVRA by streaming the
  document, stored as CAS-backed metadata on the remote's repository-level document; a package
  miss is then a lookup and a stream-and-verify fetch. A path that is neither a document the
  current or a retained `repomd.xml` names nor a location in its index answers `404` with no
  upstream request, so the remote is not an open relay (zypper's `media.1/media` probe included).
- **A tree whose `primary` carries `xml:base` is refused**: its `repomd.xml` answers `502` with
  the reason in the operator record, because serving it verbatim sends dnf elsewhere with the
  user's credential, and rewriting it breaks the upstream signature.
- **Packages are immutable artifacts** keyed by the checksum `primary` lists; their header
  signature is verified against the remote's configured vendor keys when set, as a verdict for
  policy, never as a precondition of serving, because the client verifies it itself.
- **Missing resources are negatively cached** with the short TTL on `404` and `410`; a `429` or
  `5xx` is never cached as absence (`proxy-cache.md` AC9).
- **URL rewriting** is none: every href is relative.
- **Publish and every management operation against a remote repository answer `405`.**

Upstream removal maps onto the settled purge-or-flag table as this format's side of that
contract. It differs from other formats in one row, because the client verifies a package against
the `primary` this registry serves verbatim:

| Upstream event, as observed at revalidation or fetch | Classification |
|---|---|
| A package leaves `primary` in a new revision (Fedora's updates repository does this routinely) | An ordinary metadata change: the new revision serves; the cached file stays fetchable by clients holding the older revision while that revision is retained, and is then evictable; no divergence is recorded, since it is the ecosystem's normal flow |
| A new revision lists a different checksum at a location already cached | An immutability violation recorded and alerted, and the package route serves the bytes matching the revision the client holds: the new bytes are fetched and verified as a new blob, the old blob stays servable to the older revision, because a client verifies against the checksum it was given and serving the other bytes fails every install (captured) |
| A new `repomd.xml` fails its signature or metalink check, or a document or package fails its checksum, or a body is truncated | An integrity failure: nothing committed, no negative entry, the previous verified revision keeps serving, the operator is alerted, the next request tries again |
| An advisory appears in or changes in `updateinfo` | An ordinary metadata change, served with the revision |

### Advisories, OSV and the security-signal rule

Nothing on this wire is an explicit security signal: `updateinfo` carries vulnerability
advisories (the fixed versions of an erratum), never a malware takedown, and no upstream
quarantines a package. **The shared security-signal rule's upstream channel never fires for this
format.** OSV carries the Red Hat family and SUSE as ecosystems keyed by distribution and release
(`Red Hat:enterprise_linux:9::baseos`, `Rocky Linux:9`, `AlmaLinux:9`, `openSUSE:Leap 15.6`,
`SUSE:Package Hub 15 SP6`; queries for `openssl` at 1:3.0.7-24.el9 answered 11 Red Hat, 9
Rocky and 11 AlmaLinux advisories, live), and none for Fedora; the Rocky export holds `RLSA` and
`RXSA` records and no `MAL` record, so the feed channel has nothing to condemn with either.

Advisory-dependent rules can bind only when the repository says which ecosystem its packages
belong to, because an RPM name and EVRA mean different packages in different distributions. Per
the resolved OSV decision below, a repository may declare one OSV ecosystem string; an
advisory-dependent rule attached to a repository without one, or declaring one OSV does not
list, is refused at configuration, as `supply-chain-policy.md` refuses any rule that cannot bind.
Coordinate rules and signature-verdict rules bind without it. Detection is passive, per
`proxy-cache.md`'s resolved signal-detection decision (was Q12).

Per the resolved preconfigured-upstream decision below, no distribution mirror is preconfigured.

### Virtual repositories

`hex.md` found virtual repositories impossible because every registry resource is signed under
the repository's own name. Nothing on this wire names the repository: `repomd.xml.asc` is
detached and its key comes from the client's own configuration. A `virtual` RPM repository is
therefore expressible, at the cost that its metadata is this registry's, and per the resolved
virtual-repository decision below:

- **A virtual tree is the merge of its members' trees at the same path.** For each tree path any
  member holds, the service generates a `primary`, `filelists`, `other`, `updateinfo`, `group` and
  `modules` from the members' records and signs `repomd.xml` with the virtual repository's key.
  Remote members contribute their cached revisions and are re-merged when those revalidate.
- **Resolution is per package name, in member order**: the first member whose tree holds any
  version of a name contributes every version of it, and later members' versions of that name are
  omitted. A hosted member placed first therefore shadows a same-named distribution package
  entirely, the dependency-confusion defence, and two members never contribute versions of one
  name for the client to choose between. Advisories, groups and module streams merge by id with
  the first member winning.
- **Package bytes are the members'**, served through the virtual route; package signatures stay
  the publisher's and the distribution's, so a client lists the virtual repository's key and every
  vendor key in `gpgkey` (the operator documentation's repository file).
- A publish or management operation against a virtual repository answers `405`.

The recommended client configuration is one repository file per virtual tree, one `baseurl`,
`gpgcheck=1`, `repo_gpgcheck=1`, and `gpgkey` listing the virtual repository's key document and
the vendor keys; with that configuration a refusal holds with egress open (AC16).

### Conformance, the clients and the corpus

The eight pinned clients straddle real differences, all captured: dnf5 omits `filelists`, uses
zchunk with multi-range requests, refuses two-packet signatures, skips failing repositories on
Fedora and fetches keys without credentials; dnf 4.7 refuses Ed25519 package signatures; dnf 4.14
and 4.20 refuse SHA-1; zypper challenges before credentials, ignores `xml:base`, accepts unsigned
packages under signed metadata and skips failing repositories. The catalogue counts one ecosystem
with five distributions in its multiplier row; all eight clients appear in the matrix's Client
column under the RPM row, and every hosted and proxied case runs on all eight unless it names a
client-specific behaviour. SUSE in the multiplier row is proven by the SLES 15 SP7 BCI image, not
by openSUSE.

**Every case runs with the client's network restricted to this registry and its stand-ins**,
except AC16's open-egress half, which exists to prove no fallback occurs. Each case writes its
repository file and, for zypper credentials, its credentials file as client-side state in its
`script`, removes the image's own repository files, and installs the harness CA system-wide.
Cases that follow a publish run `dnf --refresh` or `zypper ref`, because a client caches metadata
for 48 hours by default (dnf's documented `metadata_expire`; dnf5 on Fedora 44 reports
`metadata_expire = 172800`).

The recorded surface for the replay corpus: against dl.rockylinux.org, repo.almalinux.org,
cdn-ubi.redhat.com and download.opensuse.org, a `repomd.xml`, its signature where one exists, the
documents dnf 4, dnf5 and zypper each fetch, one package per tree through its redirect where one
occurs, and a missing package; against dl.fedoraproject.org the same plus the zchunk range
sequence. The reference implementation for the hosted side is a static tree createrepo_c 1.2.1
generates from the corpus's packages, signed with GnuPG, served by a pinned static server, so
`Capabilities()` declares reference-implementation availability `available`. The write surface
has no reference (no client publishes), an exception-list entry. Recording gates on the harness's
redaction criterion (`conformance-harness.md` AC13), whose rule for this format names the
`Authorization` header and URL userinfo; `User-Agent` is normalised per client. Deliberate
divergences go on the exception list before their flow is expected to replay: gzip where Fedora
serves zstd and zchunk, no SQLite documents, the `Packages/{filename}` layout, `timestamp` and
`revision` values, `Cache-Control` on `repomd.xml`, `405` on remote writes and `409` on
republish.

## Acceptance Criteria

- [ ] AC1: With the client network restricted to this registry, a hosted tree publishing a
      publisher-signed `swhello` that requires `swdep` installs both on Fedora 44, Rocky 9.8,
      RHEL 9.8 UBI, AlmaLinux 8.10 and AlmaLinux 10.2 with `gpgcheck=1` and `repo_gpgcheck=1`,
      and on openSUSE Leap 15.6, Tumbleweed and SLES 15 SP7 with zypper's default `gpgcheck`;
      the transcript shows `repomd.xml`, `repomd.xml.asc`, the key document and the documents
      each client family fetches (no `filelists` from dnf5), and the installed files equal the
      published package's.
- [ ] AC2: Every hosted `repomd.xml.asc` is an armored detached signature holding exactly one
      signature packet, by the repository's RSA key of at least 3072 bits with a SHA-256 or
      stronger digest, and verifies on all eight clients; a tree whose signature is removed,
      replaced by one from another key, or left stale after `repomd.xml` changes is refused by
      every client with its captured message, and a two-packet signature is refused by dnf5.
- [ ] AC3: The two trust layers stay independent: a package whose publisher signature is absent
      is refused by every dnf client under `gpgcheck=1` and by zypper under `pkg_gpgcheck=1`,
      installs under dnf's `gpgcheck=0` with `repo_gpgcheck=1` and under zypper's default
      `gpgcheck`, and a package signed by a key the client did not import is refused; the
      bytes the package route serves have the digest of the bytes published, asserted for
      every hosted package in the suite, so the registry never signs or alters a package.
- [ ] AC4: A publish regenerates and re-signs its tree in exactly one snapshot that holds the
      packages and the tree's documents; after `dnf --refresh` or `zypper ref` every client sees
      the new package; two concurrent publishes into one tree both appear in the resulting
      `primary`; publishes to two trees of one repository leave each other's `repomd.xml`
      byte-identical; and repointing to the predecessor serves its `repomd.xml`, signature and
      documents byte-identical.
- [ ] AC5: A client holding a `repomd.xml` from before a later publish fetches every document it
      names after that publish lands, while its snapshot is retained, and the refresh succeeds on
      all eight clients; every repodata file answers `HEAD`, a single range and a multi-range
      request with `multipart/byteranges`, and dnf5 completes a zchunk delta refresh against a
      proxied tree listing `primary_zck`.
- [ ] AC6: A publish of three RPM files to one tree creates exactly one snapshot; a file that is
      not an RPM, whose header or payload digest fails, or whose tree path is outside the grammar
      is refused with `422` and nothing committed; a republish of identical bytes creates no
      snapshot; different bytes at an existing coordinate, a retired coordinate (including after
      the deleting snapshot was pruned) and a package whose canonical filename collides with a
      different epoch's are refused with `409`; and the stored filename is the header's canonical
      one whatever the upload was called, listed in `primary` with the `location href`
      `Packages/{filename}`.
- [ ] AC7: An advisory published through the management endpoint for `swhello-1.1` is listed by
      `dnf updateinfo list` and `info` on dnf 4 and dnf5 and by `zypper list-patches` and
      `zypper info -t patch`, and `dnf upgrade --security` and `zypper patch` upgrade a host
      holding `swhello-1.0`; withdrawing it removes it; an advisory naming an absent package is
      refused with `422`; each change is one snapshot.
- [ ] AC8: A comps group set through the management endpoint is listed by `dnf group list` and
      installed with its mandatory packages by `dnf group install` on dnf 4 and dnf5, in one
      snapshot, and a group naming an absent mandatory package is refused with `422`.
- [ ] AC9: A module stream set through the management endpoint installs its default profile with
      `dnf module install` on Rocky 9.8 and AlmaLinux 8.10 and is listed by `dnf module list` on
      Fedora 44, in one snapshot, and a module whose artifacts name a NEVRA the tree lacks is
      refused with `422`.
- [ ] AC10: Deleting a version through the management endpoint removes it from `primary` in one
      snapshot, after which every client fails to install it and its package route answers
      `404`; deleting a package retires every version and keeps the `Package` row; every
      management operation is refused with no snapshot for a principal lacking its action (`push`
      for publish, advisories, comps and modules, `delete` for deletions and withdrawal) and
      answers `405` against a remote or virtual repository.
- [ ] AC11: No hosted or virtual `repomd.xml` is signed by the handler: an architecture test
      proves the handler package holds no key and performs no signing; after a key rotation every
      tree's `repomd.xml` is signed by the new key in one write, the key document served as
      `repomd.xml.key` lists both keys,
      and every client that previously trusted the old key installs with `-y` or
      `--gpg-auto-import-keys` and refuses without them.
- [ ] AC12: `SWHELLO` does not resolve `swhello` on any client; `swplus++` and
      `swtilde-1.0~rc1^git1` install on every client through both their percent-encoded (`%2b`,
      `%5e`, `%5E`) and raw request forms, a `+` never decoding to a space; `swepoch` with epoch 2 installs and is stored
      as `2:3.0-1.noarch`; a `src` package publishes into the same tree without being offered for
      installation; and no hosted or virtual document contains `xml:base`.
- [ ] AC13: On a private repository over TLS, dnf 4 and dnf5 install with `username` and
      `password` in the repository file and with URL userinfo, sending Basic on every request,
      and zypper installs with URL userinfo and with a credentials file, after a `401` carrying
      `WWW-Authenticate: Basic`; a credential-less request answers `401` identically for a private
      and a missing repository, a token lacking `pull` answers `404`, and a rejected token
      answers `401` and is never served as anonymous; dnf5 installs with the key from a `file://`
      `gpgkey`; and no credential appears in logs, error bodies or metrics.
- [ ] AC14: A token holding `pull` patterned `el9/swhello/**` fails at `repomd.xml` on every
      client and fetches an in-pattern package by `curl` while refused an out-of-pattern one; a
      token holding `push` patterned `el9/swhello/**` publishes `swhello` into `el9` and is
      refused publishing `swdep` or into `el8` with no snapshot created, and is refused every
      advisory, comps and module operation; and in proxied mode the patterned `pull` token is
      refused an out-of-pattern package.
- [ ] AC15: A package the shared policy layer refuses answers `403` with the `{"errors": [...]}`
      body naming the policy on the hosted and the proxied path, while `repomd.xml` and every
      document still answer `200` and still verify; every client exits non-zero with its captured
      message, the body present in the transcript; and the four dnf retries produce one refusal
      record.
- [ ] AC16: With client egress open and the recommended one-`baseurl` configuration, a refused
      package fails on every client with no request for it reaching any host but this registry,
      and with a second configured repository listing the same NEVRA it still fails with no
      request to the second repository's package, asserted at the network layer.
- [ ] AC17: A remote repository over a stand-in mirror whose `repomd.xml` is signed by a vendor
      key installs on all eight clients configured with that vendor key only: `repomd.xml`, its
      signature and every document served are the upstream's byte for byte, the upstream
      signature was verified against the configured key before the revision was served, every
      document and package was verified against its checksum before commit, and a second install
      from a fresh container reaches this registry while the stand-in receives no request.
- [ ] AC18: A stand-in whose new `repomd.xml` fails its signature or its configured metalink
      hash, whose document or package mismatches its checksum, or whose body is truncated, is
      never committed to the CAS; the previous verified revision keeps serving and installing;
      the real reason is recorded observably to the operator; and the next request fetches
      again.
- [ ] AC19: A proxied `repomd.xml` is revalidated after its TTL and not before, conditionally
      against `ETag` and `Last-Modified` stand-ins, a package published upstream becoming
      installable after the TTL and not before absent an explicit refresh; checksum-named
      documents and packages are never revalidated; a path no cached revision names answers
      `404` with no upstream request; an upstream `404` is negatively cached while a `429` or
      `5xx` is neither cached as absence nor surfaced as not-found.
- [ ] AC20: A remote over a stand-in mirror root answering package requests with a cross-host
      `302` installs through a host on its artifact allowlist, refuses a host outside it with the
      host in the operator record, and forwards the upstream credential to the configured root
      host only, asserted at the network layer; a location climbing outside the remote's root is
      refused with no upstream request; and a tree whose `primary` carries `xml:base` answers
      `502` on `repomd.xml` with the reason recorded.
- [ ] AC21: A stand-in presenting each removal-table event produces this format's
      classification: a package leaving `primary` serves the new revision with no divergence
      recorded while a client holding the old revision still fetches it; a changed checksum at a
      cached location records and alerts a divergence while each revision's clients receive the
      bytes their `primary` names and install; and a changed `updateinfo` is served with the
      next revision, as this format's side of the removal table in `proxy-cache.md` (its AC13).
- [ ] AC22: A virtual repository over a hosted and a remote member serves, per tree path, a
      merged `primary` signed by the virtual repository's key, from which a hosted `swhello`
      placed first shadows the upstream's `swhello` so that no upstream version of that name is
      listed or fetched, asserted at the network layer; dnf 4, dnf5 and zypper install a hosted
      and a proxied package in one transaction through one `baseurl` with the virtual key and the
      vendor key in `gpgkey`; a member's change re-merges and re-signs the tree in one write; and
      publish to the virtual answers `405`.
- [ ] AC23: A policy rule depending on advisory data attached to an RPM repository with no
      declared OSV ecosystem, or declaring `Fedora`, is refused at configuration naming the
      reason; with `Rocky Linux:9` declared, an advisory from the controlled source naming a
      cached package's EVRA refuses it on the proxied path and the same rule refuses a hosted
      package; coordinate rules and signature-verdict rules attach and refuse as configured on
      both paths.
- [ ] AC24: Replay-match passes against a corpus recorded from dl.rockylinux.org,
      repo.almalinux.org, cdn-ubi.redhat.com, download.opensuse.org and dl.fedoraproject.org and
      from a pinned static server over a createrepo_c 1.2.1 tree, covering the recorded surface
      named in Design, with `User-Agent` normalised and the `Authorization` header and URL
      userinfo redacted.
- [ ] AC25: A tree whose `primary` exceeds the inline metadata threshold is stored as CAS blobs
      that survive a GC sweep while a retained snapshot names them and install afterwards on
      dnf5 and zypper, and a proxied location index above the threshold survives a sweep while
      its revision is current or retained.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/rpm/hosted_install_test.go` (eight pinned images, network-restricted client containers, image repository files removed; transcript assertions per client family; installed file comparison) |
| AC2 | conformance + unit | `conformance/rpm/metadata_signature_test.go` (valid, absent, foreign-key, stale and two-packet signatures, eight clients, captured messages asserted); `internal/format/rpm/signature_shape_test.go` (packet count, key type and size, digest algorithm of every generated signature) |
| AC3 | conformance + integration | `conformance/rpm/package_signature_test.go` (unsigned and foreign-key packages under each client's `gpgcheck` settings); `internal/format/rpm/bytes_unaltered_test.go` (published digest equals served digest for every fixture) |
| AC4 | conformance + integration | `conformance/rpm/republish_test.go` (publish then `--refresh` and `zypper ref`); `internal/format/rpm/snapshot_test.go` (snapshot count, two concurrent writers into one tree, two trees independent, repoint byte comparison) |
| AC5 | conformance + integration | `conformance/rpm/refresh_race_test.go` (client paused between `repomd.xml` and its documents across a publish, eight clients); `conformance/rpm/zchunk_test.go` (dnf5 delta refresh through a proxied stand-in); `internal/format/rpm/range_test.go` (`HEAD`, single and multi-range) |
| AC6 | integration | `internal/format/rpm/ingest_test.go` (non-RPM, digest failure, bad tree path, idempotent republish, different bytes, retired coordinate after pruning under an injected clock, epoch filename collision, canonical renaming, three-file batch snapshot count) |
| AC7 | conformance + integration | `conformance/rpm/advisory_test.go` (management-endpoint publish in the `script`, then `dnf updateinfo`, `dnf upgrade --security`, `zypper list-patches`, `zypper patch`; withdrawal); `internal/format/rpm/advisory_ingest_test.go` (absent package refusal, snapshot count) |
| AC8 | conformance + integration | `conformance/rpm/comps_test.go` (dnf 4 and dnf5 group list and install); `internal/format/rpm/comps_ingest_test.go` |
| AC9 | conformance + integration | `conformance/rpm/modules_test.go` (Rocky 9.8 and AlmaLinux 8.10 module install, Fedora 44 module list); `internal/format/rpm/modules_ingest_test.go` |
| AC10 | conformance + integration | `conformance/rpm/manage_test.go` (delete version and package, then real installs and a `curl` of the package route); `internal/format/rpm/manage_auth_test.go` (action refusals with snapshot count unchanged, `405` on remote and virtual) |
| AC11 | architecture test + conformance | `internal/format/rpm/arch_test.go` (no key, no signing in the handler package); `conformance/rpm/key_rotation_test.go` (rotation on eight clients with and without auto-import) |
| AC12 | conformance + unit | `conformance/rpm/names_test.go` (case, `++`, tilde and caret, epoch, `src` package, eight clients); `internal/format/rpm/path_decode_test.go` (percent forms, `+` literal); `internal/format/rpm/no_xmlbase_test.go` (every generated document) |
| AC13 | conformance + integration | `conformance/rpm/auth_test.go` (private repository over TLS; dnf `username`/`password` and userinfo, zypper userinfo and credentials file, challenge header asserted, dnf5 `file://` key; anonymous, `pull`-less and rejected tokens); `internal/auth/leak_test.go` (Basic material redaction for this format) |
| AC14 | conformance + unit | `conformance/rpm/pattern_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, in both modes; patterned `pull` failure on eight clients, patterned `push` in and out of pattern, management refusals); `internal/format/rpm/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC15 | conformance + integration | `conformance/rpm/policy_test.go` (hosted and proxied modes; rules through the `policies` key; exit status, client text, transcript body and metadata `200` asserted); `internal/format/rpm/refusal_record_test.go` (four retries, one record) |
| AC16 | conformance | `conformance/rpm/no_fallback_test.go` (open-egress client network with a second repository stand-in listing the same NEVRA; network-layer assertion) |
| AC17 | conformance | `conformance/rpm/proxied_install_test.go` (vendor-signed stand-in mirror; eight clients with vendor key only; byte comparison; network-level second-install assertion) |
| AC18 | integration | `internal/format/rpm/proxied_integrity_test.go` (bad signature, metalink mismatch, document and package checksum mismatches, truncated body; CAS and reference assertions; previous revision still serving; operator record) |
| AC19 | conformance + integration | `conformance/rpm/proxied_ttl_test.go` (mutating stand-in with `ETag` and `Last-Modified` variants, network-level counts); `internal/format/rpm/proxied_negative_test.go` (unknown paths with no upstream request, `404`, `429` and `5xx`) |
| AC20 | integration + conformance | `internal/format/rpm/upstream_redirect_test.go` (allowlisted and refused redirect hosts, credential scope, climbing location); `conformance/rpm/proxied_redirect_test.go` (install through a cross-host `302`); `internal/format/rpm/xmlbase_refusal_test.go` |
| AC21 | integration | `internal/format/rpm/removal_test.go` (stand-in presenting each event; the shared-layer half is `proxy-cache.md` AC13's) |
| AC22 | conformance + integration | `conformance/rpm/virtual_test.go` (shadowing with the network layer showing no upstream request for the shadowed name; mixed install on dnf 4, dnf5 and zypper; `405`); `internal/format/rpm/virtual_merge_test.go` (per-name first member, advisory and group merge, re-merge on member change in one write) |
| AC23 | integration + conformance | `internal/format/rpm/policy_config_test.go` (advisory rule without or with an unlisted ecosystem refused; coordinate and signature-verdict rules); `conformance/rpm/advisory_policy_test.go` (controlled advisory through the `advisories` key, both paths) |
| AC24 | conformance | `conformance/rpm/replay_test.go` |
| AC25 | integration | `internal/storage/metadata_root_test.go` (threshold crossing with a generated tree and a proxied location index, sweep, serve); `conformance/rpm/large_tree_test.go` (dnf5 and zypper install after the sweep) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their type, virtual member order and
repository metadata document (the OSV ecosystem declaration and trusted package keys included),
`credentials`, `upstreams` (a stand-in mirror signed by a fixture vendor key, variants for
mutation, corruption, redirection, throttling, `xml:base` and zchunk, and a metalink stand-in),
`state` for pre-published packages, `advisories` and `policies` for AC15 and AC23. Two
obligations on the harness are recorded rather than assumed, and listed in the sibling
consequences: a `state` entry for a hosted package is servable only once its tree is generated
and signed, so the seed path invokes the same signing and index service the write path does; and
an RPM case must remove the client image's own repository files and install the harness CA
system-wide, because dnf5 ignores `sslcacert` for key downloads. The runner-enforced
obligations, both modes and the unauthenticated, unauthorized and pattern-refusal cases in each,
apply from the sibling specs and are not restated per criterion.

## Implementation Phases

### Phase 1: Hosted reads and the signed trees
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- The format-first mount, tree path parsing, the repodata and package routes with `HEAD` and
  ranges, percent-decoding, the Basic challenge, seeded packages through `state` with generated
  and signed trees, the per-route addressed objects and the `403` rendering

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- Batch publish with its ingest rules, advisories, comps groups and module metadata, deletion
  with the retirement set, key rotation, the write-boundary declaration exercised under
  concurrency

### Phase 3: Proxied path
- Waits on `upstream-adapters.md` and `artifact-verification.md` (Blocking preconditions)
- Verified `repomd.xml` revisions with TTL, immutable documents and ranges, the location index,
  verified packages, `xml:base` refusal, negative caching, the removal table, the OSV declaration,
  `405` on remote writes

### Phase 4: Virtual repositories, corpus and gate
- The per-tree merge with per-name shadowing, the recorded corpus against the five live
  upstreams and the createrepo_c reference, the eight clients in the matrix, the exception-list
  entries named in Design

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The ten questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible by
the owner at any time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: how a repository relates to the trees clients name (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a repository holds any
number of trees identified by a path declared at publish, each independently generated and
signed; a remote's trees are its upstream's paths (Design, "Trees"; AC4, AC6, AC14).

The question: a client's `baseurl` names one rpm-md tree, and distributions keep one tree per
release, variant and architecture.

**Recommendation:** A. It gives hosted and proxied repositories the same shape, a remote over a
mirror root necessarily holding many trees; it lets `$releasever` and `$basearch` in one
repository file serve a fleet; and it keeps writes to different trees uncontended.

| Option | You get | It costs |
|---|---|---|
| **A. Many trees per repository, path declared at publish** | One repository per product or team; symmetric with remotes; per-tree regeneration | A tree path in every coordinate and addressed object; a grammar for it |
| **B. One tree per repository** | The simplest model | A hosted repository per release and architecture, and remotes that cannot be one mirror root |
| **C. A configured fixed depth, as Nexus and Artifactory do** | Familiar to their users | A repository-wide setting that the publish must match, and no mixed-depth layouts |

**Why this is yours:** it fixes the unit users create, grant and point clients at.

Accepted cost: the tree segment in the addressed object, which also makes a patterned grant
able to confine a token to one release.

### Resolved: who signs packages on the hosted path (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: packages carry their
publisher's signature, the registry stores and serves the published bytes unaltered, verifies
the signature for policy, and never signs a package (Design, "Two trust layers"; AC3).

The question: dnf's default `gpgcheck=1` refuses unsigned packages (captured), so either
publishers sign or the registry does.

**Recommendation:** A. A digest is a package's identity here, and signing rewrites the signature
header, so a registry-signed package is different bytes from what the publisher built and
tested, dedup across repositories is lost, promotion between repositories with different keys
changes bytes, and a proxied package could never be treated alike; the metadata layer already
gives an unsigning publisher an end-to-end chain (`gpgcheck=0` with `repo_gpgcheck=1`, captured).

| Option | You get | It costs |
|---|---|---|
| **A. Publisher-signed, bytes never altered** | Package identity equals the published digest; the vendor key stays the provenance; one rule on both paths | Unsigning publishers' users set `gpgcheck=0` on dnf and rely on the signed metadata |
| **B. Registry signs every package at ingest** | Stock `gpgcheck=1` works for any publisher | Served bytes differ from published ones; a Go RPM signature writer in the ingest path; per-repository keys change bytes on promotion |
| **C. Per-repository choice** | Both audiences served | Two byte-identity rules to explain and test |

**Why this is yours:** it decides what "signed" means for a package in this registry.

Accepted cost: the operator documentation's two repository-file recipes, and a revisit through
`signing-service.md` if unsigning publishers prove common.

### Resolved: the metadata key and its distribution (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: one RSA key per hosted
and virtual repository, held by the signing service, published in each tree's
`repodata/repomd.xml.key` under the repository's ordinary read authorization, with dnf5 hosts of
private repositories provisioning the key as a file (Design, "What the signing and index service
must provide", "Authentication"; AC2, AC11, AC13).

The question: dnf5 fetches `gpgkey` URLs without credentials (captured), so a private
repository's key route is unreadable to it.

**Recommendation:** A. A per-repository key bounds a compromise to one repository, and keeping
the key route inside authorization preserves `auth.md` AC17's rule that a private repository is
indistinguishable from a missing one; a key file shipped with the repository file is how
enterprises already distribute distribution keys, and it worked (captured).

| Option | You get | It costs |
|---|---|---|
| **A. Per-repository key, no authorization carve-out** | Contained compromise; the existence rule intact | dnf5 on a private repository needs the key as a file |
| **B. Anonymous key route per repository** | dnf5 fetches the key by URL | Anyone can probe which private repositories exist, contradicting `auth.md` AC17 |
| **C. One instance-wide key, served anonymously** | One key for every client | One key compromise re-signs every repository's metadata; a sibling decision for every signed format |

**Why this is yours:** it trades a client-configuration step against the existence-oracle rule.

Accepted cost: the dnf5 recipe in the operator documentation.

### Resolved: rendering a package policy refusal (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `403` with the
`{"errors": [...]}` body on the package route, metadata unchanged (Design, "Policy refusals on
the wire"; AC15, AC16).

**Recommendation:** A. It is the cross-format rendering; a refused package never falls back to
another repository (captured), so the refusal holds; and eliding the package from `primary`
would mean re-signing a tree on every policy change and could not be done at all to a proxied
tree whose upstream signature is served verbatim.

| Option | You get | It costs |
|---|---|---|
| **A. `403` on the package route, metadata unchanged** | One rendering; enforcement without touching signed metadata | Clients report a bare status after four retries; the reason reaches the operator, not the user |
| **B. Elide refused packages from `primary`** | The resolver picks an older allowed version | Per-policy regeneration and signing, metadata differing by caller, and impossible for verbatim proxied trees |
| **C. Refuse the tree's `repomd.xml`** | A loud failure on EL | Fedora's dnf5 and zypper skip the repository and resolve elsewhere (captured) |

**Why this is yours:** it trades a terse client message against enforcement that cannot be
side-stepped.

Accepted cost: the operator documentation explains the dnf and zypper messages.

### Resolved: what a proxied tree serves (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: upstream `repomd.xml`,
its signature and every document are served verbatim after verification, and trees with
`xml:base` are refused (Design, "The proxied path"; AC17, AC20).

**Recommendation:** A. A distribution host keeps its stock key, because upstreams sign metadata
and packages with one key (live); nothing tens of megabytes large is regenerated on every
upstream refresh; and the one thing verbatim serving cannot do safely, redirecting clients
through `xml:base`, is refused rather than rewritten.

| Option | You get | It costs |
|---|---|---|
| **A. Verbatim after verification** | Stock keys work; no regeneration; lock-step with the upstream | `xml:base` trees cannot be served; trust in a TLS-only upstream is recorded as unverified |
| **B. Regenerate and re-sign under the remote's key** | Uniform trust anchor; `xml:base` removable | Every client imports this registry's key for distribution metadata; a 30 MB regeneration per upstream revision |

**Why this is yours:** it decides whose key a distribution's users trust through this registry.

Accepted cost: the `502` refusal for `xml:base` trees and the operator record of unverified
upstreams.

### Resolved: virtual RPM repositories (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a virtual tree is the
per-path merge of its members' trees with per-name first-member resolution, generated and signed
with the virtual repository's key (Design, "Virtual repositories"; AC22).

**Recommendation:** A. It is the one-URL recipe for private plus distribution content, the
per-name rule is the dependency-confusion defence `terraform.md` adopted, and the signature
being this registry's is the unavoidable price of any merged index.

| Option | You get | It costs |
|---|---|---|
| **A. Merged per tree, per-name first member, re-signed** | One `baseurl`; shadowing; no mixed versions of one name | The virtual's key in every client's `gpgkey`; a merge on every member change |
| **B. No virtual repositories; clients list several with `priority`** | Upstream signatures untouched | No shadowing guarantee, and a refused `repomd.xml` on one of them is skipped on Fedora and zypper |
| **C. Union of every version from every member** | Every version visible | A public version of a private name becomes installable |

**Why this is yours:** it sets precedence semantics users rely on for private names.

Accepted cost: re-merging large upstream trees, and the note on shadowed versions.

### Resolved: module metadata on hosted trees (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: module documents are a
tree-level management operation with the artifact-presence check (Design, "The hosted publish
path"; AC9).

**Recommendation:** A. dnf 4 on EL8 and EL9, both in support, installs module profiles
(captured), so a registry claiming those distributions must be able to host what their
AppStream trees carry; the presence check closes the filtering trap captured.

| Option | You get | It costs |
|---|---|---|
| **A. Hosted module metadata with validation** | Parity with EL8 and EL9 AppStream | A document type dnf5 cannot install from |
| **B. Proxied only** | Nothing to validate | Internal modular content cannot be hosted |

**Why this is yours:** it decides whether a retiring ecosystem feature is carried.

Accepted cost: the `modules` document in the service's generation list.

### Resolved: the write boundary of a multi-package publish (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: one publish carries one
or more packages for one tree and is one write with one regeneration (Design, "The hosted
publish path"; AC6).

**Recommendation:** A. A release is several packages that depend on one another, a tree
regeneration is proportional to the tree rather than the change, and a half-published release
visible between two snapshots is a resolution failure a client can hit.

| Option | You get | It costs |
|---|---|---|
| **A. Batch publish, one write** | Atomic releases; one regeneration | A larger request, bounded by the spool |
| **B. One package per write** | The simplest API | A regeneration and a snapshot per package, and partial releases visible |

**Why this is yours:** it fixes a management-API shape that `management-api.md` inherits.

Accepted cost: recorded for `management-api.md`.

### Resolved: how an RPM repository binds to OSV (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a repository may declare
one OSV ecosystem string, without which advisory-dependent rules are refused at configuration
(Design, "Advisories, OSV and the security-signal rule"; AC23).

**Recommendation:** A. An RPM coordinate means a different package in each distribution and
release, and OSV keys its RPM ecosystems exactly that way (live), so a guess would match the
wrong advisories; a declaration per repository is the smallest unit that can be right.

| Option | You get | It costs |
|---|---|---|
| **A. Per-repository declaration** | Correct matching; refusal where none is declared | One remote per distribution release for advisory policy |
| **B. Infer from `repomd.xml` or package release tags** | No configuration | `.el9` names four ecosystems; wrong matches both ways |
| **C. Per-tree mapping** | One remote for many releases | A pattern-to-ecosystem table in repository configuration |

**Why this is yours:** it sets what an operator must configure before advisory policy works.

Accepted cost: the configuration step, recorded for `supply-chain-policy.md`.

### Resolved: preconfigured distribution mirrors (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: no RPM upstream is
preconfigured; operators configure the distribution, release and mirror they use (Design,
"Advisories, OSV and the security-signal rule").

**Recommendation:** B, for a reason other than effort: there is no single canonical RPM upstream
as there is for npm or Maven; each distribution has its own, each release its own trees, and the
right mirror is regional, so any preconfigured one privileges a distribution and a region.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure one or more distributions' mirrors** | A zero-configuration cache for those | A distribution preference baked into every install, and mirrors outside the user's region |
| **B. User-configured** | No privileged distribution | A configuration step for every user |

**Why this is yours:** it extends a set the owner priced for three upstreams.

Accepted cost: proxied cases run against stand-ins; the real mirrors are exercised by the
recording session and the nightly job once configured.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | a3c1e0f | authoring pass: grounded first draft, not a review | Grounded four ways: captured traffic from dnf5 5.4.3 (Fedora 44), dnf 4.14 (Rocky 9.8, RHEL 9.8 UBI), dnf 4.7 (AlmaLinux 8.10), dnf 4.20 (AlmaLinux 10.2) and zypper 1.14.94 and 1.14.101 (Leap 15.6, Tumbleweed, SLES 15 SP7 BCI), images pinned by digest, against a logging stub on dedicated Podman networks serving repositories built with Fedora 44's createrepo_c 1.2.1, rpm-sign 6.0.2 and GnuPG 2.4.9 and Rocky 9's rpm-sign 4.16 (request sequences per family, dnf5 omitting filelists, gz, xz, bz2, zstd and zchunk with single and multi-range requests, armored, binary, absent, foreign-key and two-packet metadata signatures with dnf5 refusing two packets, unsigned, foreign-key, Ed25519 and SHA-1 package signatures with AlmaLinux 8 refusing Ed25519 and EL9 and EL10 refusing SHA-1, zypper accepting unsigned packages under signed metadata, tampered primary and package checksums, `xml:base` followed by dnf with credentials and ignored by zypper, percent-encoding of `+` and `^`, epochs, case, updateinfo, comps and modules effects, 401, 403, 404 and 500 rendering with no body printed, four dnf retries, fallback to a second mirror but not to a second repository and Fedora and zypper skipping a refused repository, preemptive Basic on dnf and challenged Basic on zypper, dnf5 fetching keys without credentials or `sslcacert`, key rotation, revalidation with no conditional requests, and the republish race); the dnf, dnf5 and libzypp configuration references and createrepo_c's README and help; the live Fedora, Rocky, AlmaLinux, UBI and openSUSE mirrors (signature presence and keys, caching headers, metadata types and sizes, the Fedora metalink, openSUSE's cross-host `302`); and OSV's ecosystem list and exports (Red Hat, Rocky, AlmaLinux, SUSE and openSUSE covered by release, no Fedora, no MAL records). Ten questions written in decision shape and adopted under the standing delegation: many trees per repository (AC4, AC6, AC14), publisher-signed packages never altered (AC3), a per-repository metadata key with no authorization carve-out (AC2, AC11, AC13), `403` package-level refusals with metadata unchanged (AC15, AC16), verbatim proxied metadata with `xml:base` trees refused (AC17, AC20), merged and re-signed virtual trees with per-name shadowing (AC22), hosted module metadata (AC9), batch publish as one write (AC6), a per-repository OSV ecosystem declaration (AC23), no preconfigured mirror. Twenty-five criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
