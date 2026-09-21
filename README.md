# artifactory

An open artifact repository: a multi-format package registry with **upstream caching, SSO and
RBAC included**, not paywalled.

> **Status: pre-alpha.** Nothing here runs yet. The repository currently holds the working
> harness, the project charter and the specs. Code follows the specs, not the other way round.

## Why

For containers, free is solved (Harbor, Quay, Zot). For multi-format hosting, free is solved
(Gitea and Forgejo cover about 24 formats). What nobody ships for free is the combination:
multi-format, **plus** caching proxies of upstream registries, **plus** virtual aggregation,
**plus** a usable UI, **plus** single sign-on.

Pulp has the plumbing and no UI. Gitea has the UI and the formats but cannot cache an upstream.
Harbor has all three and speaks only OCI. JFrog and Sonatype have all of it and fence SSO, HA
and quotas behind a licence.

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
