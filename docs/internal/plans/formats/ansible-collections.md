---
status: draft
status_description: "Early draft, never interrogated. The empty Open Questions section means not yet examined, not settled, and the frontmatter previously claimed the opposite. A first review is the prerequisite for being a gate candidate at all."
description: "Spec for the Ansible Galaxy v3 collection format - the single format where free, easy, private hosting does not already exist."
author: michielvha
goal: "Serve the one ecosystem whose only free self-hosted options are heavy enough that practitioners abandon them."
priority: "medium"
issue: 10
created: 2026-09-21
covers:
  - "internal/format/ansible/**"
---

# Plan: Ansible Galaxy collections

## Context

This format inverts the charter's general rule. Everywhere else, hosting alone is not
differentiating because Gitea does it for free. Ansible is the exception:

- Gitea's 23 package types do **not** include Ansible, and Forgejo's support is an unmerged
  community proposal.
- The only free options are Galaxy NG and pulp_ansible, both built on Pulp with Django,
  PostgreSQL, Redis and workers. Practitioners describe running them as heavy to the point of
  abandonment.
- Nexus, Artifactory and ProGet either lack the format or are not free.
- The common fallback is installing collections from raw git, which has no versioning semantics,
  no discovery and no access control.

Evidence and sources: `docs/internal/research/prior-art-artifact-repositories.md`.

So here, **hosting alone is the product**, and a lightweight private collection registry with
SSO is a genuinely unserved need.

## Scope

**In scope:** Galaxy v3 version discovery, collection index and detail, versioned artifact
download, multipart publish with the asynchronous import-task status endpoint the client polls,
and token authentication in the header form `ansible-galaxy` actually sends.

**Out of scope:** roles. They use the older v1 API and install from git rather than from
published artifacts, which is a different feature wearing the same name.

## Design notes

A collection artifact is a `namespace-name-version.tar.gz` containing `MANIFEST.json` and
`FILES.json` with per-file SHA256 digests, so ingest validation is a tarball read plus digest
verification.

Exact endpoint paths must be pinned by observing `ansible-galaxy` during the spec review, not
taken from documentation - the standing rule applies with particular force here, since the
Galaxy API has both a Galaxy NG routing style and a plainer v3 style in the wild.

## Acceptance Criteria

- [ ] AC1: `ansible-galaxy collection publish` uploads a collection and the import task reports
      success through the endpoint the client polls.
- [ ] AC2: `ansible-galaxy collection install` installs that collection into a clean environment
      with a matching content digest.
- [ ] AC3: A `requirements.yml` naming this server installs correctly, and the server can be
      added to `ansible.cfg` `server_list` alongside public Galaxy.
- [ ] AC4: Collection dependency resolution works across two collections where one depends on the
      other.
- [ ] AC5: Token authentication succeeds in the exact header form the client sends, verified from
      captured traffic rather than from documentation.
- [ ] AC6: The proxied path installs a collection from public Galaxy and serves it from cache on
      a second install.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/ansible/publish_test.go` |
| AC2 | conformance | `conformance/ansible/install_test.go` |
| AC3 | conformance | `conformance/ansible/requirements_test.go` |
| AC4 | conformance | `conformance/ansible/deps_test.go` |
| AC5 | conformance | `conformance/ansible/auth_test.go` |
| AC6 | conformance | `conformance/ansible/proxied_test.go` |

## Open Questions

None. This spec is an early draft for a format scheduled after the
harness exists, and its design will be revisited before implementation - so an empty
section here means "not yet interrogated", not "fully settled".

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
