---
description: "The portable memory of this repository: mistakes, their root causes, and the conventions they produced. Newest first."
covers: []
---

# Lessons

Newest first. Each entry records a mistake, its root cause, and the convention it produced.
Anything learned that would otherwise live only in a chat session belongs here.

## 2026-09-21 - Inherited conventions arrive with someone else's incident history

**What happened:** the working harness (agents, hooks, docs tooling, conventions) was ported from
Stackweaver. Several rules arrived with concrete examples attached - specific issue numbers,
named subsystems, a duplicated ansible-runner path - that are meaningless here.

**Root cause:** a convention's *punch* comes from the incident that produced it, and incidents do
not port.

**Convention:** the inherited rules were genericised, and this file starts empty on purpose. Every
rule here earns its example from something that actually happened in this repository. When a rule
has no local incident behind it yet, say so rather than inventing one.

The one inherited rule kept with deliberate force is the duplicated-path trap: upstream it was
"the ansible-runner has two execution paths and a claim verified against one is not verified".
Here it is **hosted vs proxied**. Same failure, different subsystem.
