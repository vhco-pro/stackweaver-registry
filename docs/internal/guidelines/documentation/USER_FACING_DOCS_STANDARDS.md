---
description: "Standards for user-facing documentation: what belongs in docs/ versus docs/internal/, the prose style, and the structural rules every published page follows."
covers: []
---

# User-Facing Documentation Standards

> **There are no user-facing docs yet.** This project is pre-alpha and everything currently lives
> under `docs/internal/`. These standards are ported and adapted ahead of need so the first
> published page is not also the page that invents the conventions.

## What is user-facing documentation?

Anything written for someone **using or operating** the registry rather than building it:
installation and deployment, configuring a repository or an upstream proxy, pointing a package
client at the server, authentication and access control setup, API reference, and
troubleshooting.

It lives directly under `docs/`.

## What is not

Implementation plans and specs, research and prior-art surveys, root-cause analyses, bug reports,
audit ledgers, conformance results, and anything whose audience is a contributor rather than a
user. These live under `docs/internal/` and are excluded from publication.

The test is the audience, not the subject. "How the blob GC works" can be either: a user needs to
know retention behaviour and how to configure it, a contributor needs the invariant and the race
conditions. Write them as two documents rather than one that serves neither.

## Writing style

### Full sentences, not bullet fragments

User-facing prose explains. Bullet lists are for genuinely enumerable things (a list of supported
formats, a set of required permissions), not for chopping an explanation into fragments the
reader has to reassemble.

Numbered steps are the exception and are correct where the reader really does follow them in
order.

### Explain the why, not only the what

"Set the metadata TTL" is a fact. "Set the metadata TTL to control how quickly newly published
upstream versions become visible; shorter values cost more upstream requests" is documentation.
A user who understands the trade-off can choose; a user who only knows the knob exists will file
an issue.

### Write for the reader in front of you

An operator deploying the server and a developer pointing `npm` at it need different pages. Say
which one a page is for, at the top, rather than writing one page that half-serves both.

### Descriptive headings

`## Configuring an upstream proxy`, not `## Config`. Headings are the navigation and the search
surface; a one-word heading is neither.

## Never copy code into docs

Reference the source file and the **symbol name** instead:

```markdown
See the `BlobStore` interface in `internal/storage/cas.go`.
```

Copied code goes stale silently and no tooling catches it. Symbol names stay greppable across
refactors in a way line numbers do not - see [DOCUMENTATION_STANDARDS.md](./DOCUMENTATION_STANDARDS.md)
for the evidence behind that rule.

The exception is **commands and configuration the user actually types**. Those are not
implementation, they are the interface, and they belong in the page in full:

```bash
npm config set registry https://registry.example.com/npm/my-repo/
```

## Structure

Every published page opens with a sentence saying what it covers and who it is for, then the
content, then links to the logical next pages. Avoid a page that ends without telling the reader
where to go.

Group by task, not by subsystem. A user looking for "how do I cache npm" should not have to know
whether that is the proxy layer or the npm handler.

## Frontmatter

Every page needs at minimum a `description`, which is what the parent index shows. Pages that
describe code also carry `covers` globs naming the code areas they document, using
directory-level globs (`internal/proxy/**`) so they survive file moves.

`covers` is what makes `scripts/check-doc-coverage.js` able to tell you that your change may have
invalidated a page. A published page with no `covers` will drift and nothing will warn you.

## Review checklist

- Would this help someone trying to use or operate the registry, rather than modify it?
- Is it prose where it should be prose, and steps where it should be steps?
- Does it explain the trade-off behind every setting it introduces?
- Are code references symbol names rather than copied blocks or line numbers?
- Does the frontmatter carry a `description`, and `covers` if it describes code?
- Does it link onward?

## File naming

Lowercase with hyphens: `configuring-upstream-proxies.md`. The filename appears in the URL and
outlives the page title.
