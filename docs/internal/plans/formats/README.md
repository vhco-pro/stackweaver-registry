---
description: "One spec per package format, each owning its own protocol surface and conformance gaps."
---

# formats

One spec per package format, each owning its own protocol surface and conformance gaps.

## Contents

| Name | Description |
|------|-------------|
| [ansible-collections.md](./ansible-collections.md) | Spec for the Ansible Galaxy v3 collection format - the single format where free, easy, private hosting does not already exist. |
| [cargo.md](./cargo.md) | Spec for the Cargo (Rust) registry format: the sparse index protocol and the crates.io-style web API, hosted and proxied, with cargo as the conformance oracle for reads, publish and yank alike. |
| [catalogue.md](./catalogue.md) | The full format catalogue: every ecosystem targeted, grouped by shared wire protocol into families, tiered by build order, with the count that defines the breadth moat. |
| [composer.md](./composer.md) | Spec for the Composer (PHP) repository format: the packages.json root, the per-package p2 metadata files with their minification and ~dev split, dist archives, the in-band filter-list and security-advisory channels, hosted through the registry-owned management API and proxied against Packagist, with Composer as the conformance oracle. |
| [generic.md](./generic.md) | Spec for the generic/raw artifact format - the trivial protocol used to prove the harness, CAS, auth and CI wiring end to end. |
| [go-modules.md](./go-modules.md) | Spec for the Go modules format: the GOPROXY protocol hosted and proxied, the checksum-database passthrough, and what hosted means for an ecosystem with no publish API. |
| [helm.md](./helm.md) | Spec for the classic Helm chart repository format (index.yaml plus .tgz and .prov over HTTP), hosted and proxied, and how it relates to the OCI path that oci.md already covers. |
| [hex.md](./hex.md) | Spec for the Hex (Elixir and Erlang) format: the signed protobuf registry resources, the package tarball with its inner and outer checksums, the HTTP API that mix and rebar3 publish and retire through, hosted and proxied, with the shared signing service producing every hosted registry document and hex.pm's signed payloads served unmodified on the proxied path. |
| [maven.md](./maven.md) | Spec for the Maven repository layout: the path-addressed release and SNAPSHOT files, the three levels of generated maven-metadata.xml, checksum and signature sidecars and Gradle Module Metadata, hosted and proxied, with Maven, Gradle, sbt and Leiningen as the conformance oracles. |
| [npm.md](./npm.md) | Spec for the npm registry format, where the caching proxy of the public registry is the primary use case rather than private publishing. |
| [nuget.md](./nuget.md) | Spec for the NuGet v3 registry format: the service index, the flat container, the paged registration hives, search and the PackagePublish push and unlist surface, hosted and proxied, with the dotnet CLI as the conformance oracle. |
| [oci.md](./oci.md) | Spec for the OCI distribution format - the hardest protocol with the strongest oracle, implemented as the harness's proving ground rather than to replace Harbor. |
| [pub.md](./pub.md) | Spec for the Pub format (Dart and Flutter): the hosted pub repository API v2, hosted and proxied, where the client unilaterally enforces content hashes, excludes retracted versions, and deletes its stored token on any 401. |
| [pypi.md](./pypi.md) | Spec for the PyPI format, scheduled as the experiment's generalisation test - does format N+1 cost less than format N? |
