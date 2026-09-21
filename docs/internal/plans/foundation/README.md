---
description: "Foundation specs: the harness, storage, the format interface and the proxy layer. These gate everything else."
---

# foundation

Foundation specs: the harness, storage, the format interface and the proxy layer. These gate everything else.

## Contents

| Name | Description |
|------|-------------|
| [conformance-harness.md](./conformance-harness.md) | Spec for the conformance harness that drives real package clients against the server in containers, including the recording proxy that turns real client traffic into a golden corpus. |
| [format-handler-interface.md](./format-handler-interface.md) | Spec for the common format handler interface, defining the hosted and proxied paths every format must implement and the boundaries handlers may not cross. |
| [project-charter.md](./project-charter.md) | The project charter: what this builds, what it deliberately does not build, the autonomy experiment it doubles as, and the sequence that makes both work. |
| [proxy-cache.md](./proxy-cache.md) | Spec for the upstream proxy and cache layer - the project's actual differentiator, covering cache policy, negative caching, offline mode and upstream credentials. |
| [storage-and-gc.md](./storage-and-gc.md) | Spec for the content-addressable blob store and its garbage collector, including the fault-injection testing that conformance structurally cannot provide. |
