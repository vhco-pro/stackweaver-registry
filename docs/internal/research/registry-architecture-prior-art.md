---
description: "How existing open-source registries structure multi-format support: Gitea's shared four-table model, Pulp's Content/Artifact abstractions and download policies, Harbor's upstream adapters, and the plugin-boundary options with their evidence."
covers: []
---

# Registry architecture: prior art

Grounded survey of how the projects that already solved multi-format support actually structure
it, gathered to make the plugin-architecture decisions on evidence rather than taste.

## Gitea: 23 formats, no plugin runtime at all

The single most instructive data point, because it is the largest free multi-format registry in
existence and it is written in Go.

**It has no dynamic plugin system.** Formats are compile-time packages in a monolith, split
across three layers:

| Layer | Responsibility | Verified contents |
|---|---|---|
| `modules/packages/<type>` | Parse and validate the uploaded artifact, extract metadata | 22 dirs: alpine, arch, cargo, chef, composer, conan, conda, container, cran, debian, goproxy, helm, maven, npm, nuget, pub, pypi, rpm, rubygems, swift, terraform, vagrant |
| `routers/api/packages/<type>` | The ecosystem's HTTP endpoints | 23 format dirs, the above plus `generic`, next to a shared `helper` |
| `services/packages/` | Shared storage and model logic; per-type code only where needed | shared files plus only 7 type dirs: alpine, arch, cargo, container, debian, rpm, terraform |

Two findings matter.

**1. One shared data model serves all 23 formats:**

```
Package 1--* PackageVersion 1--* PackageFile *--1 PackageBlob
```

Breadth is affordable because the *model* is generic, not because the *runtime* is pluggable.
Each format is metadata parsing plus routes on top of four shared tables.

**2. Only 7 of 23 formats need service-layer code**, and the list is diagnostic: alpine, arch,
cargo, container, debian, rpm, terraform. Those are exactly the formats with **generated or
signed repository indexes** (apk indexes, pacman databases, the Cargo index, OCI manifests, apt
`Release`, `repomd.xml`, the Terraform registry protocol). Everything else is a thin per-format
package.

This directly corroborates the catalogue's tiering: signed-index formats are the expensive
class, and they should be specced with extra care rather than treated as "one more format".

## Pulp: the richest abstraction, and the one that already solved proxying

Pulp is Python and the UI story is weak, but its *model* is the most thought-through in the
field and it is the only prior art that treats proxying as a first-class modelling concern
rather than a bolt-on.

Core abstractions a plugin implements against:

| Abstraction | Meaning |
|---|---|
| `Artifact` | A stored file identified by checksums. The content-addressed blob. |
| `Content` | A metadata unit (a package, a module, an image) |
| `ContentArtifact` | Links content to artifacts at a relative path |
| **`RemoteArtifact`** | **Where to fetch an artifact that is not stored locally** |
| `Remote` | A configured external source |
| `Repository` / `RepositoryVersion` | Named collection, plus immutable versioned snapshots |
| `Publication` / `Distribution` | A prepared version, and the URL it is served at |

Plugins are discovered at startup by scanning Python entry points, and pulpcore supplies the
models, serializers, download machinery and task system.

### The insight worth stealing: download policies

`RemoteArtifact` is what lets content exist in the system *without being downloaded*. Combined
with a per-remote policy, it produces three behaviours from one model:

| Policy | Behaviour |
|---|---|
| `immediate` | Download everything at sync time |
| `on_demand` | Fetch on first client request, then **store it**, so it is downloaded once |
| `streamed` | Fetch on request, serve, **do not store** |

`on_demand` is exactly pull-through caching, and it falls out of the data model rather than
being a separate cache subsystem. Note also that when several remotes provide the same content,
Pulp creates **one** `Content` and **many** `RemoteArtifact`s, and tries each in turn on fetch.

This is a direct, proven answer to `proxy-cache.md` Q1 (is the cache a separate store?). Pulp's
answer is no: same store, and "cached" is a property of how an artifact arrived, not where it
lives.

## Harbor: upstream adapters are their own plugin axis

Harbor is OCI-only, but it has 15 compile-time adapters for *upstream registries*:
`aliacr`, `awsecr`, `azurecr`, `dockerhub`, `dtr`, `githubcr`, `gitlab`, `googlegcr`, `harbor`,
`huawei`, `jfrog`, `native`, `quay`, `tencentcr`, `volcenginecr`.

The lesson is that **"format" and "upstream" are two different plugin axes.** One OCI format
handler needs many upstream adapters, because ECR, GCR and Docker Hub differ in authentication
and quirks, not in wire format. Any design that conflates the two will hard-code Docker Hub's
auth into the OCI handler and then need surgery for ECR.

## zot: build-tag extensions

zot gates optional features at compile time with paired files
(`extension_events.go` / `extension_events_disabled.go` behind build tags). A third model:
not dynamic, but binary size and attack surface shrink when a feature is off.

## The plugin-boundary options, with evidence

| Option | Who does it | Gets you | Costs |
|---|---|---|---|
| **A. Compile-time Go interfaces** | Gitea (23 formats), Harbor | Simplest by far; one binary; no IPC; refactors are type-checked across all formats | Third parties cannot add a format without forking; every format ships in every binary |
| **B. Build-tag gated** | zot | A-plus-slimmer binaries and smaller attack surface | Combinatorial build matrix; a format can break only in a configuration nobody built |
| **C. Out-of-process gRPC** | HashiCorp `go-plugin`: Terraform, Vault, Nomad, Packer | Third-party formats without forking; a crashing plugin cannot take down the host; plugins ship on their own schedule | Performance cost on every call, explicitly acknowledged upstream; local-network only by design; protocol versioning becomes a permanent compatibility surface |
| **D. WASM** | No registry precedent found | Sandboxed, language-agnostic | Streaming multi-gigabyte blobs across a WASM boundary is the wrong shape; immature |

**The evidence leans hard toward A.** The largest free multi-format registry in existence ships
23 formats with no plugin runtime, and the cost it pays is one it does not appear to feel.
Option C's benefit is third-party extensibility, which matters only once there is a third party
who wants it.

The important caveat is that **A and C are not mutually exclusive over time**, but only if the
interface is designed for C from the start: a clean, serialisable, stream-shaped interface can
later be exposed over gRPC, whereas an interface that passes `*http.Request` around cannot. That
makes this a decision about interface *shape* today even if the boundary stays in-process.

## What this implies for our specs

1. **`format-handler-interface.md` Q1 (HTTP directly vs abstracted) is not a style question.**
   It decides whether an out-of-process boundary is ever possible. Passing `*http.Request` locks
   in option A permanently.
2. **`proxy-cache.md` Q1 has a proven answer**: same store, with cached-ness modelled as how the
   artifact arrived. Adopt Pulp's `RemoteArtifact` concept and its three download policies.
3. **A shared generic data model is the real enabler of breadth**, per Gitea. Our specs currently
   leave the metadata model to each handler, which would reproduce 31 bespoke schemas. That needs
   a foundation spec of its own. (Note, 2026-09-26: the figure is kept as written at the time of
   this survey. The catalogue has since split its "Git-backed" label into the three wire
   protocols it covered, so the target is now 33 protocol implementations and the equivalent
   figure 33; `data-model.md` exists as the spec this point called for.)
4. **Upstream adapters are a separate axis from format handlers**, per Harbor. Our `proxy-cache.md`
   does not currently distinguish them.
5. **Signed-index formats are a distinct, expensive class**, per Gitea's 7 service-layer types.
   They need shared signing infrastructure, not per-format reinvention.

## Sources

- [Gitea package registry overview](https://docs.gitea.com/usage/packages/overview/) and the
  `modules/packages`, `routers/api/packages`, `services/packages` trees on `go-gitea/gitea@main`
- [Pulp core architecture](https://pulpproject.org/pulpcore/docs/admin/learn/architecture/),
  [concepts](https://pulpproject.org/pulpcore/docs/user/learn/concepts/),
  [on-demand support](https://pulpproject.org/pulpcore/docs/dev/learn/other/on-demand-support/),
  [pull-through caching](https://pulpproject.org/pulpcore/docs/dev/learn/subclassing/pull-through/)
- [hashicorp/go-plugin](https://github.com/hashicorp/go-plugin)
- `goharbor/harbor` `src/pkg/reg/adapter`, `project-zot/zot` `pkg/extensions`
