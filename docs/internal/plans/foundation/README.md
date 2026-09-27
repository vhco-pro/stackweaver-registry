---
description: "Foundation specs: the harness, storage, the format interface and the proxy layer. These gate everything else."
---

# foundation

Foundation specs: the harness, storage, the format interface and the proxy layer. These gate everything else.

## Contents

| Name | Description |
|------|-------------|
| [artifact-verification.md](./artifact-verification.md) | Spec for artifact signature and attestation verification: one shared verifier behind the handlers and the proxy layer, per-repository trust sets, Sigstore, OpenPGP, CMS, apk, RPM, JWS, Ed25519 and TUF entries for the ecosystems the format specs raise, and a stored per-digest verdict that supply-chain-policy.md consumes. |
| [auth.md](./auth.md) | Spec for the two auth surfaces a registry needs: human identity via a standard OIDC client with a local-admin fallback, and machine identity via scoped registry tokens that package clients can actually present. |
| [conformance-harness.md](./conformance-harness.md) | Spec for the conformance harness that drives real package clients against the server in containers, including the recording proxy that turns real client traffic into a golden corpus. |
| [credential-management.md](./credential-management.md) | Spec for the credential-management surface: issuing, listing, rotating and revoking registry tokens under /api/v1/tokens, the robot-account principal that lets automation outlive the people who set it up, the expiry states that make a dying token visible before it fails, registered public keys for clients that sign requests, and an OIDC exchange that mints short-lived tokens for CI without a stored secret. |
| [data-model.md](./data-model.md) | Spec for the shared generic data model every format stores against, adapting Gitea's four-table package model and Pulp's RemoteArtifact and download policies. |
| [format-handler-interface.md](./format-handler-interface.md) | Spec for the common format handler interface, defining the hosted and proxied paths every format must implement and the boundaries handlers may not cross. |
| [management-api.md](./management-api.md) | Spec for the registry-owned management API: the one surface through which hosted content is administered across every format (publish where no client publishes, withdraw and restore, annotate, delete, retire), repositories and pointers are administered, and every operation is one completed logical write with one audit record; client-native routes such as npm unpublish and cargo yank are bindings onto the same operations. |
| [project-charter.md](./project-charter.md) | The project charter: what this builds, what it deliberately does not build, the autonomy experiment it doubles as, and the sequence that makes both work. |
| [proxy-cache.md](./proxy-cache.md) | Spec for the upstream proxy and cache layer - the project's actual differentiator, covering cache policy, negative caching, offline mode and upstream credentials. |
| [question-triage.md](./question-triage.md) | Triage of every open spec question into three tiers by what it blocks, so decisions are made in dependency order rather than all at once. |
| [replication.md](./replication.md) | Spec for replicating content between registry instances - geo-distribution, disaster recovery and air-gapped mirroring - built on the content-addressed store and immutable snapshots. |
| [signing-service.md](./signing-service.md) | Spec for the shared signing and generated-index service: the production form of the write-triggered services prototype's signed-index half. It regenerates every repository-wide or version-scoped generated document inside the write that invalidates it, stores it as CAS-backed metadata, keeps signatures as records outside snapshot content so rotation and rollback never rewrite history, renders pointer-scoped freshness (dated envelopes, TUF versions, forward-moving Last-Modified), holds every signing key behind one custody seam (encrypted file, KMS, PKCS#11, operator-held) that no handler can reach, publishes public keys in each ecosystem's form, and runs virtual merges as deferred work. Twenty-two formats consume it; it produces and never verifies. |
| [storage-and-gc.md](./storage-and-gc.md) | Spec for the content-addressable blob store and its garbage collector, including the fault-injection testing that conformance structurally cannot provide. |
| [supply-chain-policy.md](./supply-chain-policy.md) | Spec for scanning artifacts and enforcing supply-chain policy at the registry boundary - blocking by vulnerability, licence or signature state, on both hosted and proxied content. |
| [write-triggered-services-prototype.md](./write-triggered-services-prototype.md) | Defines the write-triggered services prototype that format-handler-interface.md AC8 names as an input to the scheduled interface re-open: what it must demonstrate for both classes its deciding record named (signed indexes, with Debian as the vehicle, and asynchronous operations, with a Galaxy-shaped publish-and-poll), and how anyone would know it succeeded. |
