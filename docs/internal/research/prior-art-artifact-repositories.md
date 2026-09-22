---
description: "Survey of existing artifact repository managers, establishing that the unserved gap is multi-format plus upstream caching plus SSO, and that hosting alone is already solved for free."
covers: []
---

# Prior art: artifact repository managers

## The question

Is there a genuinely free, fully-featured artifact repository, or do the open-source options all
paywall the essentials? The common belief is the latter. It is half right, and the half that is
wrong determines what this project should and should not build.

## The landscape

### Genuinely free, SSO included, no asterisk

| Tool | Licence | Covers | Limit |
|---|---|---|---|
| **Harbor** (CNCF graduated) | Apache 2.0 | OCI: images, Helm-as-OCI, arbitrary OCI artifacts. Replication, Trivy scanning, Cosign/Notation signing, proxy cache | OCI only |
| **Gitea package registry** | MIT | 23 formats: Alpine, Arch, Cargo, Chef, Composer, Conan, Conda, Container, CRAN, Debian, Generic, Go, Helm, Maven, npm, NuGet, Pub, PyPI, RPM, RubyGems, Swift, Terraform, Vagrant | **No upstream proxy/caching** |
| **Forgejo package registry** | GPL | Same family as Gitea | Same limit |

The Gitea figure is **counted from source**, not taken from its documentation: `routers/api/packages`
on `go-gitea/gitea@main` holds 23 format packages plus a shared `helper`, and `modules/packages`
holds 22 metadata parsers (`generic` needs none, having no metadata to extract). Gitea's own
overview page says 24. Where a documented number and a counted one disagree, this project cites
the counted one and says so.
| **GitLab CE** | MIT core | Most formats, plus a dependency proxy | Heavy; you inherit all of GitLab |
| **Pulp 3** | GPLv2 | rpm, deb, container, python, ansible, maven, npm, gem, file, ostree, with real sync/promote/publish | Headless API, weak UI story |
| **Project Quay** | Apache 2.0 | OCI | OCI only |

OIDC, LDAP and SAML are free in all of the above. **"Open-source artifact repos all paywall SSO"
is a JFrog and Sonatype behaviour, not an industry law.**

### The fenced ones

- **JFrog Artifactory OSS** covers Maven, Gradle, Ivy and generic only. No Docker, no npm. JFrog
  has steered users toward the separate free-tier Container Registry instead.
- **Sonatype Nexus Repository** is the sadder story: the long-standing free OSS edition became a
  "Community Edition" in early 2025 carrying component and request ceilings plus mandatory
  registration. The thing people used for a decade as the free Artifactory got meaningfully
  fenced. Do not build a plan around either.

## The actual gap

Nobody ships, for free, the combination:

> multi-format **+** remote proxy/caching of upstreams **+** virtual aggregation **+** a usable
> UI **+** SSO

- Pulp has the plumbing and no UI.
- Gitea and Forgejo have the UI and the formats and **cannot cache an upstream**.
- Harbor has proxy, UI and SSO, and speaks only OCI.

That triangle is the unserved space, and it is unserved because it is genuinely hard, not
because of a conspiracy.

## Why the free field is fragmented

Maintenance cost, not build cost. Every ecosystem changes its protocol on its own schedule:
Cargo moved to a sparse index, npm added provenance, PyPI added attestations, OCI added the
referrers API. Each of those quietly broke or dated somebody's weekend project. The build is a
few months; the treadmill is forever, and the treadmill is what kills volunteer implementations.

This is the load-bearing observation for this project. An executable conformance harness turns
that treadmill into a scheduled job, which is the one cost structure that makes a free,
multi-format, well-maintained registry plausible.

## What this means for scope

1. **Hosting alone is not a product.** A format that only hosts is a format Gitea already does
   for free, with a better UI and a decade of users. The proxy/cache layer is the
   differentiator and must be designed in from the first format, not bolted on.
2. **Do not reimplement OCI hosting for its own sake.** Harbor is free, excellent, and two lines
   of Compose away. OCI is worth implementing here for a different reason: it has an *official
   conformance suite*, which makes it the ideal proving ground for the harness.
3. **The credible pitch is "free, with SSO, RBAC and upstream caching"**, not "Artifactory
   clone". Competing on breadth against a fifteen-front protocol war is how a focused project
   dies.
4. **Licence matters to the pitch.** Harbor is Apache 2.0 and Gitea is MIT. A project claiming to
   be the free one must actually be OSI open source, or the claim collapses on contact. This
   project is Apache 2.0 for that reason.

## Ansible collections: the one format with no good free option

Surveyed separately and worth calling out, because it inverts the conclusion above. Gitea's 24
formats do **not** include Ansible; Forgejo has an unmerged community proposal for it. The only
free options are Galaxy NG and pulp_ansible, both of which practitioners describe as heavy
(Pulp, Django, Postgres, Redis and workers) to the point of abandonment. Everything else is
proprietary or does not support the format.

So Ansible collections is the rare case where hosting alone *is* differentiating.

## Sources

- [Gitea package registry overview](https://docs.gitea.com/usage/packages/overview/) - the
  24-format table and the absence of both Ansible and proxying
- [Forgejo package registry docs](https://forgejo.org/docs/latest/user/packages/)
- [Self-hosted Galaxy packages in Forgejo, Ansible forum](https://forum.ansible.com/t/self-hosted-galaxy-packages-in-forgejo-git-server/45369) -
  practitioner accounts of Galaxy NG and Pulp
- [Host your own on-premise Ansible Galaxy, Pulp project](https://hackmd.io/@pulp/ansible-containers)
- [OCI distribution spec](https://specs.opencontainers.org/distribution-spec/) and its
  conformance suite
