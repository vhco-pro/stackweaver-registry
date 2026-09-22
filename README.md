# Stackweaver Registry

An open artifact repository: a package registry for **33 language and OS ecosystems**, with
**upstream caching, SSO and RBAC included**, not paywalled.

Part of the Stackweaver family; a separate platform, same brand.

> **Status: pre-alpha.** Nothing here runs yet. The repository currently holds the working
> harness, the project charter and the specs. Code follows the specs, not the other way round.

## Why

For containers, free is solved (Harbor, Quay, Zot). For multi-format hosting, free is solved
(Gitea and Forgejo cover 23 formats). What nobody ships for free is the combination:
**breadth, plus caching proxies of upstream registries, plus single sign-on.**

Pulp has the plumbing and no UI. Gitea has the UI and 23 formats and **cannot cache an upstream**.
Harbor caches beautifully and speaks **only OCI**. JFrog and Sonatype have all of it and fence SSO,
HA and quotas behind a licence.

Breadth is the moat. 33 ecosystems across ~31 protocol implementations, reaching 50+ client tools
and distributions - one Maven-layout handler serves Maven, Gradle, SBT, Ivy and Leiningen; one
Debian archive handler serves every apt-based distro. The full mapping is public
(`docs/internal/plans/formats/catalogue.md`) rather than hidden behind a marketing number.

What makes it affordable is not arithmetic, it is the conformance harness: it makes each protocol
cheap to build and, crucially, cheap to *keep working* as each ecosystem changes on its own
schedule. Competitors are not blocked by the count, they are blocked by the treadmill.

The free field is fragmented mostly because of **maintenance cost**: every ecosystem changes its
protocol on its own schedule, and that grind is what kills volunteer projects. This one is built
and maintained around an executable conformance harness, so that grind is automatable.

## The harness is the product

Correctness for a package registry is not a judgment call, it is an exit code:

```
docker push        npm install        pip install        helm pull
cargo add          mvn dependency:get        ansible-galaxy collection install
```

Every format is gated by running the **real client** against the server in a container and
asserting the result. The documentation of these protocols is routinely wrong; the client is the
specification. See `docs/internal/plans/foundation/conformance-harness.md`.

## Licence

Apache 2.0. Every feature, including SSO and RBAC. See [LICENSE](./LICENSE).
