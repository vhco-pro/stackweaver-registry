---
status: draft
status_description: "Folded 2026-09-26 at 4d1aeb1 under the owner's standing delegation: all seven questions adopted (follower-side gap detection and re-seed, read-only per-repository replicas, no virtual replication, freeze for proxied content across the gap, explicit takeover with acknowledged manual fencing, pull-scoped machine tokens, out-of-band manifest digest) plus three raised and adopted in the same pass (whole pointer set replicates, chained snapshot identity for divergence detection, freeze publishes through the hosted ingest path). 20 criteria, zero open questions. Stays draft pending a gate review and sibling amendments in auth.md, data-model.md and format-handler-interface.md."
description: "Spec for replicating content between registry instances - geo-distribution, disaster recovery and air-gapped mirroring - built on the content-addressed store and immutable snapshots."
author: michielvha
goal: "Let one logical registry span sites, so a build pulls locally and an air-gapped environment can be fed a verifiable snapshot."
priority: "medium"
issue: 14
created: 2026-09-23
covers:
  - "internal/replication/**"
---

# Plan: Replication between instances

One logical registry, several instances, content moving between them.

## Context

Deferred in `storage-and-gc.md` as "later, and it depends on decisions made here". Those
decisions have since been made - content addressing, mark-and-sweep GC with a deletion-intent
barrier and five mark roots, immutable snapshots stored as deltas with periodic checkpoints
under bounded retention, and pointer-targeted snapshots exempt from pruning - so the dependency
is discharged and the remaining reason to wait was
build effort, which is no longer a constraint (`project-charter.md`, the standing scope
decision).

Replication has no step of its own in the charter's build order, and this spec does not invent
one: where it lands in the sequence is set by `project-charter.md`, which owns the build order.
The phases below sequence the work inside this spec only.

Three use cases, in descending order of how well the existing model serves them:

- **Geo-distribution**: a build in another region pulls from a local instance.
- **Disaster recovery**: a second instance holds enough to take over, and an explicit operator
  action makes it take over (the takeover section below).
- **Air-gapped mirroring**: content crosses a boundary that no network crosses, as a file -
  including content that originally came from a public upstream, carried by freezing a cache
  into a local repository first.

The foundations make this unusually tractable. Blobs are content-addressed, so transfer is
idempotent and verifiable by digest with no coordination. Snapshots are immutable and numbered,
so "replicate up to snapshot N" is a well-defined, resumable unit rather than a diff of mutable
state.

## Scope

**In scope**

- Pull-based replication: a follower instance replicates named repositories from a leader.
  Replication is **per repository**: one instance may follow a leader for some repositories,
  host its own local repositories beside them, and lead others, but no repository ever has two
  writers.
- **Read-only replicas.** A replicated repository on a follower refuses every write - publish,
  hosted delete, metadata-only mutation, and pointer management - until an explicit takeover.
- Snapshot-granular transfer, so a follower is always at a consistent point rather than
  mid-publish, with the leader's **whole pointer set** mirrored: the default pointer and every
  named environment pointer, each with the snapshot it targets.
- Content verification on arrival by digest, with nothing committed that does not verify, and a
  per-snapshot **identity** so a follower detects a divergent history instead of applying
  across it.
- **Follower-side retention-gap recovery**: the leader prunes on its own schedule and a follower
  that fell behind detects the gap and re-seeds from a checkpoint, transferring only the blobs it
  lacks.
- **Air-gapped export and import**: a snapshot range exported as a portable, verifiable archive
  and imported elsewhere with no network between them, anchored by a manifest digest the
  operator carries out of band.
- **Freeze**: an operation copying a `remote` repository's cached content into a `local`
  repository as one ordinary publish, so proxied upstream content can cross an air gap by the
  same export path.
- **Disaster-recovery takeover**: an explicit, per-repository operator command that ends
  replication and makes a replica writable, with fencing of the old leader an acknowledged
  operator duty.
- Replication of metadata at all three levels, not only blobs, so a follower serves correct
  indexes and dist-tags rather than correct bytes under wrong names.
- Interaction with GC and retention: what a follower may collect, and why a leader's pruning
  consults no follower.
- Replication authentication: a follower reads a leader with an ordinary machine token, whose
  `pull` scope on a repository authorizes that repository's replication read surface.

**Out of scope**

- Multi-leader or active-active writes. Conflict resolution across sites is a different problem
  and this spec does not pretend to solve it. A split-brain after a takeover is detected
  (divergence below), never reconciled.
- Replicating cached proxy content directly. A follower with its own upstream configuration
  fetches for itself; shipping another instance's cache is bandwidth spent to avoid bandwidth.
  The air-gapped case, where the follower has no upstream by definition, is served by freeze
  rather than by teaching `remote` repositories to replicate.
- Replicating a `virtual` repository's definition. A follower composes its own virtual
  repositories from the repositories it actually has (the virtual-repository section below).
- Signing archives with an instance key. The archive's trust root in v1 is the out-of-band
  manifest digest; a signature-based root would be built on the shared signing infrastructure,
  not here (resolved archive trust root question below).

## Design

### Snapshots make the unit obvious, but a snapshot is not a content set

A follower mirrors a leader repository's pointer set. Each pointer targets a numbered snapshot,
and replication transfers what the follower needs to reconstruct every targeted snapshot: the
deltas between what it holds and each target, plus the blobs those deltas newly reference. A
mirrored pointer moves only when the snapshot it will target has arrived whole and verified. A
follower is therefore never observably mid-publish, which is the property that makes a follower
safe to serve from.

"The deltas between N and M" is doing more work than it looks like, because per
`data-model.md`'s resolved representation a snapshot is a delta from its predecessor with
periodic full checkpoints, and the leader prunes deltas and checkpoints once no retained
snapshot depends on them. Three consequences bind the transfer unit:

- **A contiguous follower receives deltas.** A follower whose current position is inside the
  leader's retained, reconstructible history receives exactly the deltas from its position to
  the target, plus the blobs those deltas newly reference - including metadata documents stored
  as CAS blobs above the size threshold, which deltas reference by digest like any other
  content.
- **A new or gapped follower seeds from a checkpoint.** The delta chain back to snapshot 1 does
  not exist once the leader's pruning has run, so an initial seed - and a re-seed after a
  retention gap - transfers the most recent checkpoint at or before the target, the deltas from
  that checkpoint to the target, and the blobs that range's content set references which the
  follower does not already hold. Seeding is bounded by the current content set plus one
  checkpoint interval, never by history length.
- **The follower must stay reconstructible and bounded.** After any transfer, every retained
  snapshot on the follower resolves within the one-checkpoint-plus-bounded-deltas read limit
  `data-model.md` sets, and the follower's own pruning obeys the same reconstructibility
  constraint as the leader's. A transfer that ships deltas without the checkpoint they hang off
  produces a follower that cannot compute its snapshots' content sets, which makes its own
  sweep unsound.

**Blobs move by want-list.** Metadata (deltas and checkpoints) arrives first; the follower
computes which referenced digests its store lacks and requests only those. Because the store is
content-addressed, a blob the follower already holds - from an earlier snapshot, from another
repository, or from its own cache - is never transferred again, which is what keeps a re-seed
cheap in bytes even though it re-transfers a checkpoint. A digest the follower "has" but whose
blob its own sweep is deleting is handled by the shared reference-creation call and the
intent's commit gate like any other commit (the GC section below), never by a replication-local
rule.

Interrupted transfer resumes from the last completed snapshot rather than restarting, because
each snapshot is an independently valid stopping point.

### The pointer set is replicated, not only the head

Serving resolves through a `Pointer` (`data-model.md`), and a leader repository carries a
default pointer plus any number of named environment pointers. A follower that tracked only the
head would serve `prod`'s name with the default pointer's content, or not serve it at all, so
the leader's pointer set is part of what replicates (resolved pointer-set question below). The
follower holds one mirrored pointer per leader pointer, same name, same target snapshot number:

- **Every leader pointer move is reflected** at the follower's next sync - creation, promotion,
  rollback to an earlier retained snapshot, and deletion - and each mirrored pointer moves only
  once its target is complete locally. A rollback on the leader onto a snapshot the follower no
  longer holds is transferred like any other target, since the leader still holds it (it is
  inside the leader's window or pinned by the pointer that just moved onto it).
- **A pointer targeting an old snapshot is still replicated.** An environment pointer the leader
  has pinned outside its retention window (`storage-and-gc.md`'s fifth root) is reconstructible
  on the leader by definition, so the follower seeds that target from its checkpoint like any
  other. What a follower transfers is bounded by the content sets of the distinct snapshots the
  pointer set targets, plus one checkpoint interval each, never by history length.
- **The follower's replication pointer is its mirrored default pointer.** That is the pointer
  `storage-and-gc.md` names as an instance of the fifth root; every mirrored environment pointer
  is one too, for the same reason (the GC section below).

### Snapshot identity makes a divergent history detectable

Snapshot numbers alone cannot tell two histories apart: a leader restored from an older backup,
or an old leader that kept accepting writes after a follower took over, can produce a snapshot
51 whose content differs from the follower's 51. So every snapshot carries an **identity**: the
digest, under the store's digest algorithm, of its number, its delta's digest and its
predecessor's identity - the same construction as a git commit, with no key and no signature,
so it is not a new cryptographic scheme (resolved divergence-detection question below). Two
properties make it load-bearing:

- **Identities are retained forever, content is not.** Pruning drops checkpoints and deltas; it
  never drops the identity record, which references no blob and is therefore not a mark root.
  One small row per completed write is the cost of being able to compare any two positions
  after any amount of pruning.
- **A follower verifies continuity before applying anything.** At each sync it compares its own
  position's identity with the leader's identity at that number. A match means the leader's
  history extends the follower's, and transfer proceeds. A mismatch means the histories forked:
  the follower applies nothing, keeps serving what it has, and reports `diverged` with the
  highest snapshot number both sides agree on. Only an explicit operator re-seed moves it off
  that state, and that command reports the local snapshots it will discard before discarding
  them, because on a repository that was written after a takeover those snapshots are the
  split-brain writes.

A divergent history is never silently merged, applied around, or overwritten by an automatic
re-seed. The same identity check guards archive import (below).

### A replica is read-only, and replication is per repository

A replica is a `local` repository with an active replication link - the leader's URL, the
leader's repository name, and the credential reference the follower authenticates with (the
authentication section below). A replicated repository on a follower accepts writes from exactly
one source: the replication applier (resolved follower-writability question below). A client publish, a hosted delete, a
metadata-only mutation (an npm dist-tag move) and every pointer-management call are refused with
an explicit error naming the repository as a replica and naming its leader, so a CI job
misconfigured against the follower fails loudly instead of forking the history. Snapshot numbers
on a replica are the leader's numbers, because nothing else ever writes there.

The boundary is held in the shared write path, not by each handler: the shared call that commits
a snapshot or moves a pointer refuses for a repository with an active replication link unless
invoked by the replication applier, and an architecture test asserts the applier is the only
package holding that capability (AC12). A handler therefore needs no knowledge that replicas
exist.

Replication is configured per repository, so an instance can be a follower for some
repositories and a leader for others, and can host ordinary local repositories beside its
replicas, without any repository having two writers.

### Only a local repository is a replication source

Snapshot granularity decides this. A `remote` repository creates no snapshots at all -
`data-model.md` settled on-demand arrival as cache materialisation - so there is no unit for it
to replicate; a follower wanting the same upstream configures its own `remote` repository and
fetches for itself, and the air-gapped case is served by freeze (below). A replica is a `local`
repository, so it is a valid source for another follower or for an export: its snapshots carry
the leader's numbers and identities, so a second hop - a DMZ instance following the leader and
exporting archives into the gap - adds no mechanism.

A `virtual` repository is not replicable either (resolved virtual-repository question below). Its
content is a member list, not snapshots, and its members may not all exist on the follower;
replicating the definition would serve a silently incomplete aggregate under a name clients
trust. Configuring replication from a `remote` or `virtual` source is refused with an error
naming the repository type. A follower composes its own virtual repositories from what it
actually has - its replicas, its own local repositories and its own remotes - and they resolve in
member order exactly as `data-model.md` defines. The accepted cost is that a follower's virtual
definitions are maintained by hand and can drift from the leader's.

### Freeze carries proxied content across an air gap

Mirroring a public ecosystem into an air gap is the most common real-world air-gap requirement,
and it cannot go through snapshot transfer as things stand: remote repositories create no
snapshots. Freeze composes existing machinery instead (resolved air-gap proxied-content
question below). It takes a `remote` repository - optionally restricted to named packages or
versions - and publishes the content it has **cached with a local blob** into a `local`
repository as **one** completed logical write, so the result snapshots, replicates and exports
exactly like any other publish:

- **It is a real publish through the hosted path.** The target repository's handler ingests the
  cached blobs and builds that repository's own metadata documents, exactly as it would for a
  client upload (resolved freeze-metadata question below). Upstream metadata documents are
  not copied verbatim, because an upstream index lists everything upstream offers while the
  freeze holds only what was cached, and a verbatim copy would advertise files the local
  repository cannot serve. Every check on the publish path applies to a freeze; it is not a
  bypass.
- **A frozen repository never contacts an upstream.** Frozen files are ordinary published
  files. Their provenance - the source remote repository, the upstream URL and path, and when
  the cached copy was fetched - is recorded per file as provenance, not as `RemoteFile` rows,
  because a `RemoteFile` is an upstream source the model fetches from and would give a local
  repository an egress path. The provenance is readable from the API, and it travels in the
  export archive so the air-gapped side can see where content came from.
- **It is atomic against eviction and sweep.** Freeze commits through the shared
  reference-creation call, so a cached blob it references is live from the moment the reference
  commits, and a later eviction of the source cache touches nothing frozen. A cached blob that
  has already been evicted and swept by commit time fails the whole freeze with an error naming
  it and nothing committed; the operator re-warms the cache and re-runs.
- **Only cached content freezes.** Freeze does not crawl an upstream: files known only through
  `RemoteFile` rows, and anything served `streamed`, are not in the cache and are reported as
  excluded. Warming the cache on the connected side is the operator's workflow.

Freeze needs a way to drive a handler's hosted ingest from blobs already in the store, which the
pinned five-method interface (`format-handler-interface.md`) does not offer: its hosted writes
arrive over HTTP. The hook's shape is therefore an addition argued at that spec's scheduled
re-open, and the freeze phase below is sequenced after it. The freeze write kind and its
provenance record are likewise the shared data model's to define (`data-model.md` owns the
entities); this spec states what they must do.

### A follower's GC is the same GC, and replication is a second writer into its CAS

A follower runs the same mark-and-sweep over its own store, and everything `storage-and-gc.md`
settled applies unchanged:

- **All five mark roots.** On a follower, replicated snapshots inside its retention window are
  what keeps replicated content live, and the fourth root - CAS-backed metadata documents -
  matters here exactly as on a leader, because replicating metadata at all three levels means
  the follower holds metadata-document blobs that no `File` row references. The fifth root
  covers the follower's mirrored pointers: each targets a snapshot exactly as an environment
  pointer does, so every snapshot the mirrored pointer set targets, and the checkpoint-and-delta
  chain that reconstructs it, is exempt from the follower's pruning while targeted
  (`storage-and-gc.md`, resolved pointer-target question). That is a statement about the
  follower's store only; the leader's pruning consults no follower at all (the retention
  section below), so replication adds no root to the set.
- **Transfer and freeze commits go through the shared machinery.** Applying a snapshot range
  commits blobs and creates references, and so does a freeze, which makes both
  reference-creating writers exactly like an upload: they use the shared reference-creation
  call, so the deletion-intent check runs and `storage-and-gc.md` AC10's architecture test
  already covers them; they honour the intent's exclusive commit gate when committing a digest
  the sweep is deleting; and their write activity refreshes the repository-scoped grace, so
  blobs committed early in a long transfer are not swept before the deltas referencing them
  apply. None of this is new mechanism - the point of stating it is that a replication path
  with its own commit or delete route would silently break AC15's single-deleter boundary in
  `storage-and-gc.md`.
- **Mirrored pointer moves are repoints.** A leader-side promotion, rollback or pointer deletion
  arrives on the follower as a repoint or pointer deletion, which is the release path
  `storage-and-gc.md` AC18 polices, so a snapshot the follower's pointers stop targeting falls
  back under the follower's window and collects on schedule.
- **Retention on a follower runs from arrival, and a served snapshot is never pruned.** An
  air-gapped archive can legitimately arrive older than the retention window; evaluated against
  leader publish time it would be pruned on import and AC5 below would be unsatisfiable, so a
  follower's window runs from when a snapshot arrived locally. And whatever its age, a snapshot
  a mirrored pointer currently targets is never pruned out from under it - a follower fed rarely
  must keep serving what it has. Since 2026-09-26 that is not a replication-local rule but an
  instance of the fifth mark root: any pointer-targeted snapshot is unprunable while targeted,
  and a mirrored pointer is a pointer. It is released the same way, when replication moves the
  pointer to a newer snapshot or deletes it, which is what lets the old one age out and collect.

### Retention is the follower's problem, and it is never silent

A leader prunes snapshots outside its retention window on its own schedule, and **its pruning
consults no follower position** (resolved retention-gap question below). No follower state
exists on the leader for pruning to read, so an air-gapped follower that has been dark for a
month, or a follower nobody remembers registering, cannot hold the leader's storage
reclamation hostage - the shape `storage-and-gc.md` rejected for stale environment pointers.

The follower carries the cost instead, and detects it mechanically rather than discovering it
when someone asks for old content:

- **The leader advertises what it can reconstruct.** Its replication read surface reports, per
  repository, the pointer set (name, target number, target identity) and the retained snapshot
  ranges it can still serve deltas for. With the fifth root those ranges need not be
  contiguous: a pinned old environment target and its chain can sit well below the window.
- **A gap is detected on the next sync.** When the deltas from the follower's position to a
  target are not all retained, the follower cannot proceed contiguously. It reports status
  `reseeding` with reason `retention-gap`, keeps serving every snapshot its mirrored pointers
  target (pointers move only after the new target is whole, AC2), and re-seeds from a leader
  checkpoint at or before the target, transferring only the blobs it lacks.
- **Continuity is still checked.** A re-seed is a transfer like any other: the identity
  comparison runs first wherever both sides still hold the follower's position number, so a
  retention gap never masks a divergence.

The accepted cost is that a follower which falls behind pays a re-seed: one checkpoint's worth
of metadata per distinct target, plus whatever blobs changed while it was behind. Blobs it
already holds are not re-sent, which is what keeps that cost proportional to what actually
changed rather than to the repository's size.

An air-gapped follower detects the same gap at import instead (below): an archive whose range
does not connect to its position is refused, and the remedy is a seed archive, which the leader
can produce for any snapshot it can still reconstruct.

### Disaster-recovery takeover is explicit, per repository, and fenced by the operator

A replica holds everything needed to serve, and takeover is what turns that into a capability
rather than a data-availability claim (resolved takeover question below). "Takeover" is used
deliberately rather than "promotion", which `data-model.md` already names for repointing an
environment pointer.

- **Takeover is an explicit operator command on the follower, per repository.** It ends the
  replication link, records the leader, the snapshot number and identity it took over at, and
  when, and makes the repository an ordinary writable local repository. The next write creates
  snapshot N+1 on the replicated numbering, chained to N's identity, so the history is
  continuous for anyone who followed the old leader up to N.
- **Fencing the old leader is the operator's duty, and the command makes it an explicit
  acknowledgement.** Takeover refuses to run without an acknowledgement flag whose refusal
  message names the duty: the old leader must accept no further writes to that repository
  (stopped, or with every push and delete credential for the repository revoked) before the
  follower takes over. Nothing here fences mechanically; v1 accepts that a careless operator
  can produce a split brain.
- **A split brain is detected, not reconciled.** If the old leader does keep writing, its
  snapshot N+1 has a different identity from the new leader's, so any follower that applied the
  old leader's post-fork writes and is then pointed at the new leader reports `diverged` rather
  than applying (the identity section above). Reconciling the two histories is out of scope.
- **Other followers re-attach with no special path.** A follower repointed from the old leader
  to the new one continues with deltas if its position is on the shared history and still
  retained, re-seeds if it is not, and reports `diverged` if it is past the fork. Converting the
  old leader itself back into a replica of the new leader is the operator re-seed described
  above, and it lists the split-brain snapshots it would discard.

### Replication authentication rides the machine-token model

A follower authenticates to a leader with an ordinary `auth.md` machine token, held on the
follower as a credential reference in the same store that holds upstream credentials, and never
logged (resolved instance-to-instance-authentication question below). There is no distinct
instance identity: the leader's authorizer sees a token like any other.

- **`pull` on a repository authorizes that repository's replication read surface**: the pointer
  set, the retained ranges, snapshot identities, deltas, checkpoints, and blobs by digest. The
  action vocabulary stays `pull`/`push`/`delete`. A token lacking `pull` on the repository -
  including a push-only token, and a token scoped to a different repository - is refused on
  every replication route with the response an unauthorized caller receives.
- **A `pull` grant narrowed below the whole repository does not authorize replication reads.**
  This is derived rather than chosen: a delta exposes every path in the repository, so a
  credential `auth.md`'s path and tag patterns narrow to part of a repository would read
  through replication what its pattern exists to withhold. Such a token is refused on the
  replication surface, on the same reasoning by which `auth.md`'s pattern scopes refuse a
  listing outright: the response reveals objects outside the pattern.
- **The replication routes are not format-handler routes**, so no handler's `Scope(r)` maps
  them. The replication package declares its own route-to-scope mapping, evaluated by the
  central authorizer, and an architecture test asserts that every replication route is mapped
  and that none evaluates authorization itself (AC18). This is the named enforcer the
  constitution requires of a shared boundary.

The accepted cost is that `pull` widens: any pull-scoped CI token can enumerate snapshot history
and read deltas, and so can reach content that a hosted delete removed from the head but that
the leader still retains for rollback. Operators who need a token that downloads artifacts but
cannot read retained history have no such scope in v1.

### Air-gapped export is the same mechanism, written to a file

An export is the transfer format serialised: a snapshot range - deltas plus any checkpoint the
range depends on - the blobs it references (including CAS-backed metadata documents), the
snapshot identities, the pointer set at export time, the provenance records of any frozen files,
a manifest listing every digest, and enough repository identity (name, format, snapshot numbers)
for the importer to know what it is looking at. Import verifies every digest against the
manifest and the manifest against the deltas before committing anything. An archive has no
want-list negotiation, since there is no channel to negotiate over, so it carries every blob its
range newly references. Nothing about it is a special path, which is the point - a second
mechanism would be a second set of bugs.

Import carries the obligations the network path gets for free:

- **The trust root is a manifest digest carried out of band.** Export prints the digest of its
  top-level manifest, and import requires that digest as a mandatory argument, refusing to start
  without it and refusing with nothing committed when the archive's manifest does not match it
  (resolved archive-trust-root question below). Digest verification alone proves only that an
  archive is internally consistent: a rewritten manifest with a dist-tag repointed at a
  malicious version verifies perfectly against itself. The operator already carries the medium
  across the gap, so carrying a digest beside it through a separate channel is the trust root,
  and the operator guide says plainly that a digest carried on the same medium as the archive
  verifies nothing.
- **Contiguity and identity are checked, not assumed.** An archive covering snapshots N to M
  imports only onto a follower whose position is at least N-1 or inside the range, and whose
  position's identity matches the archive's identity at that number, or which is seeding from a
  checkpoint the archive carries. A gapped import is refused with an error naming the missing
  range, and a divergent one with an error naming the fork, never applied around the hole.
- **Import is atomic and idempotent.** A truncated or internally inconsistent archive - a delta
  referencing a blob the archive does not contain - is refused with nothing committed, and
  re-importing an archive whose range has already applied is a no-op rather than an error,
  because sneakernet workflows retry.

An archive may be exported from a replica as well as from the leader, since the replica carries
the leader's numbers and identities. The trust root is then the digest the exporting instance
printed.

## Acceptance Criteria

- [ ] AC1: A follower replicating a leader repository serves byte-identical content for every
      artifact under every pointer the leader carries - the default pointer and each named
      environment pointer, including one targeting a snapshot outside the leader's retention
      window - including metadata at all three levels.
- [ ] AC2: A follower's mirrored pointer moves only after the complete snapshot it will target
      has arrived and verified; a transfer killed midway leaves every mirrored pointer on the
      most recently completed target (its pre-transfer target if none completed), never a
      partially applied one.
- [ ] AC3: An interrupted transfer resumes from the last completed snapshot rather than
      restarting.
- [ ] AC4: A blob arriving with a digest that does not match is rejected and nothing is
      committed, proven by a fault-injection test that corrupts bytes in transit.
- [ ] AC5: A snapshot range exported to an archive and imported into an isolated instance with no
      network between them produces a follower serving identical content, including when the
      archive is imported after the retention window's length has elapsed since export, and
      including an archive exported from a replica rather than from the leader.
- [ ] AC6: A leader prunes on its own retention schedule with no follower position consulted, and
      a follower whose position has fallen out of the leader's retained ranges detects the gap
      on its next sync, reports `reseeding` with reason `retention-gap`, keeps serving every
      snapshot its mirrored pointers target throughout, and ends serving content identical to
      the leader's; pruning on the leader proceeds unchanged while a registered follower is
      offline.
- [ ] AC7: A follower's GC marks from all five roots over replicated content: a replicated
      CAS-backed metadata document blob that no `File` row references survives its sweep,
      every snapshot the follower's mirrored pointers target survives its pruning even when
      older than the follower's retention window and still serves, and a sweep interleaved
      with an in-progress transfer or freeze never collects a blob the transfer or freeze has
      committed - asserted by the same property test that covers the leader's mark roots, with
      transfer-apply (seed and re-seed included), mirrored pointer moves and freeze added to
      its operation set.
- [ ] AC8: A brand-new follower, and one re-seeding after a gap, seeds from a checkpoint plus
      tail deltas and succeeds against a leader that has pruned its early history; the volume
      transferred is bounded by the content set plus one checkpoint interval per distinct
      pointer target, not by history length, and a re-seed transfers no blob the follower
      already holds.
- [ ] AC9: An archive that is truncated, internally inconsistent (a delta referencing a blob the
      archive lacks), gapped relative to the follower's position, or divergent from it (a
      different identity at the follower's position number) is refused with an explicit error
      naming the problem and nothing committed; re-importing an already-applied archive is a
      no-op.
- [ ] AC10: A follower exposes, per replicated repository, its current position, each mirrored
      pointer's target, and the time of its last successful sync; a failed sync, a re-seed in
      progress and a detected divergence are each surfaced as an explicit status a monitor can
      alert on (`failed`, `reseeding`, `diverged`), never only as a log line.
- [ ] AC11: A replicated repository refuses a client publish, a hosted delete, a metadata-only
      mutation, and every pointer create, repoint and delete, each with an explicit error naming
      the repository as a replica and naming its leader, and its content is unchanged
      afterwards; on the same instance a local repository accepts writes, and one instance
      simultaneously follows a leader for one repository and serves as leader for another.
- [ ] AC12: No package other than the replication applier can commit a snapshot or move a
      pointer in a repository with an active replication link, enforced by an architecture test.
- [ ] AC13: Configuring replication from a `remote` or `virtual` source repository is refused
      with an error naming the repository type, and a virtual repository defined on the follower
      over its replicas and its own remote repositories resolves in member order.
- [ ] AC14: Freezing a remote repository's cached content produces exactly one snapshot in the
      target local repository, served through the hosted path byte-identical to the cached
      content, with metadata documents rendered by the target repository's handler and listing
      only frozen files; serving from the frozen repository makes no upstream request (asserted
      at the network layer), each frozen file's provenance names its source remote repository,
      upstream URL and path, and fetch time, files not cached are reported as excluded, and a
      freeze whose cached blob was swept before commit fails naming it with nothing committed.
      Proven for every registered format that declares proxy support.
- [ ] AC15: A freeze of a remote repository, exported and imported into an isolated instance
      running in offline mode, serves the frozen content to the ecosystem's real client there
      with no network between the instances, and the frozen files' provenance is readable from
      the importing instance's API.
- [ ] AC16: Takeover refuses to run without the operator's explicit fencing acknowledgement, with
      a refusal naming the duty; with it, the repository stops replicating, accepts writes, its
      next write creates the snapshot numbered one past the last replicated snapshot and chained
      to its identity, and its status records the leader, snapshot number and time it took over
      at.
- [ ] AC17: A follower whose position's identity differs from the leader's identity at the same
      number - produced by an old leader that kept writing after a takeover, and by a leader
      restored from an older backup - applies nothing, keeps serving, and reports `diverged`
      with the highest snapshot number both agree on; it leaves that state only through an
      explicit operator re-seed, which lists the local snapshots it will discard before
      discarding them.
- [ ] AC18: A machine token with `pull` on a repository replicates it; a token without `pull` on
      it (push-only, or scoped to another repository) and a `pull` grant narrowed below the
      whole repository are refused on every replication route with the response an
      unauthorized caller receives; and an architecture test asserts every replication route
      is mapped to a scope evaluated by the central authorizer and that no replication route
      evaluates authorization itself.
- [ ] AC19: Export prints its manifest digest; import refuses to start without a manifest digest
      argument, refuses with nothing committed when the digest does not match the archive's
      manifest, and refuses an archive whose manifest was rewritten with every internal digest
      made consistent (a dist-tag repointed at another version) when given the export-time
      digest.
- [ ] AC20: Leader pointer moves - creation, promotion, rollback to an earlier retained snapshot,
      and deletion - are reflected on the follower after its next sync, and a pointer deleted on
      the leader is deleted on the follower, releasing its pin so its snapshot ages out under
      the follower's window.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/replication/content_test.go` (default and environment pointers, one pinned outside the leader's window) |
| AC2 | fault injection | `internal/replication/atomicity_test.go` (kill mid-transfer) |
| AC3 | fault injection | `internal/replication/resume_test.go` |
| AC4 | fault injection | `internal/replication/verify_test.go` |
| AC5 | integration | `internal/replication/airgap_test.go` (leader-exported and replica-exported archives) |
| AC6 | integration | `internal/replication/retention_test.go` (leader prunes past an offline follower; follower detects, re-seeds and keeps serving) |
| AC7 | property | `internal/storage/gc_property_test.go` (transfer-apply, mirrored pointer moves and freeze in the operation set) |
| AC8 | integration | `internal/replication/seed_test.go` (leader with pruned early history; re-seed byte accounting against blobs already held) |
| AC9 | fault injection | `internal/replication/airgap_test.go` (truncated, mutated, gapped and divergent archives) |
| AC10 | integration | `internal/replication/status_test.go` |
| AC11 | integration | `internal/replication/readonly_test.go` (every write kind against a replica; mixed-role instance) |
| AC12 | architecture | `internal/replication/arch_test.go` (replica write capability held only by the applier) |
| AC13 | integration | `internal/replication/source_test.go` (remote and virtual sources refused; follower-defined virtual resolution) |
| AC14 | integration | `internal/replication/freeze_test.go` (table-driven over every handler declaring proxy support; network-level no-egress assertion; sweep-before-commit fault) |
| AC15 | conformance | `conformance/replication/freeze_airgap_test.go` (two instances, no network between them, offline mode, real client) |
| AC16 | integration | `internal/replication/takeover_test.go` |
| AC17 | integration | `internal/replication/divergence_test.go` (post-takeover split brain; leader restored from backup) |
| AC18 | integration | `internal/replication/auth_test.go` (pull, push-only, other-repository and pattern-narrowed tokens on every replication route) |
| AC18 | architecture | `internal/replication/arch_test.go` (every replication route mapped through the central authorizer) |
| AC19 | fault injection | `internal/replication/airgap_trust_test.go` (missing digest, wrong digest, rewritten self-consistent manifest) |
| AC20 | integration | `internal/replication/pointers_test.go` (create, promote, rollback, delete; pin release on the follower) |

## Implementation Phases

### Phase 0: Sibling prerequisites
Not work in this spec's package, but it gates Phase 1: `data-model.md` gains the replication link
entity and the retained snapshot identity record, and `auth.md` records that `pull` authorizes
the replication read surface and that a pattern-narrowed grant does not. Phase 4 additionally
waits on the freeze write kind and provenance record in `data-model.md` and the ingest hook at
`format-handler-interface.md`'s scheduled re-open.

### Phase 1: Pull replication
Snapshot-range transfer with want-list blob fetch, checkpoint-based seed and re-seed, snapshot
identity and divergence refusal, pointer-set mirroring, digest verification, atomic pointer
moves, resume, read-only enforcement on replicas with its architecture test, replication
authentication with its route mapping and architecture test, source-type refusal, and the
follower status surface (AC1-AC4, AC6-AC8, AC10-AC13, AC17 in part, AC18, AC20).

### Phase 2: Air-gapped export and import
The same transfer format serialised to an archive, with the out-of-band manifest digest, digest,
contiguity, identity and atomicity checks on import, and export from replicas (AC5, AC9, AC19).

### Phase 3: Disaster-recovery takeover
The takeover command with its fencing acknowledgement, numbering and identity continuation, the
operator re-seed that lists discarded snapshots, and the operator guide's fencing runbook (AC16,
AC17).

### Phase 4: Freeze of cached content
Freeze into a local repository through the handler ingest hook, provenance recording and export,
and the end-to-end air-gap proof with a real client (AC14, AC15).

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

No questions are open. The seven raised by the first review were adopted on 2026-09-26 under
the owner's standing delegation, and folding them exposed three further judgment calls (Q8-Q10),
which were raised and adopted in the same pass. Every adopted answer is reversible by the owner.

### Resolved: retention-gap recovery (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: followers detect the gap
and re-seed; the leader's pruning consults no follower. Accepted cost: a follower that falls
behind pays a re-seed - one checkpoint per distinct pointer target plus the blobs that changed
while it was behind, since blobs it already holds are never re-sent. B lost because it couples
the leader's storage reclamation to the availability of every downstream instance, and an
air-gapped follower cannot report its position at all; C lost because it builds two mechanisms
and a lease duration that is wrong for either geo-replication or air-gapped use.

Folded into: Scope (follower-side retention-gap recovery), Design (want-list blob transfer; the
retention section, rewritten), AC6 (rewritten to assert this option), AC8 (re-seed transfers no
blob already held), AC10 (`reseeding` status), Phase 1.

| Option | You get | It costs |
|---|---|---|
| **A. Followers detect the gap and re-seed** | A leader prunes on its own schedule; an offline or abandoned follower cannot pin the leader's storage | A follower that falls behind pays a full re-seed, which for a large repository is expensive and surprising |
| **B. Leader refuses to prune past its furthest-behind follower** | No follower ever needs a re-seed | Storage reclamation on the leader is held hostage by the worst follower, including ones nobody remembers registering, and an air-gapped follower has no way to report its position at all |
| **C. Leader tracks followers with a lease that expires** | Bounded version of B: a silent follower stops counting after its lease lapses | Two mechanisms and a lease duration that is wrong for either geo-replication or air-gapped use |

**Why this is yours:** it decides whether a degraded follower costs the leader storage or costs
itself a re-seed, and the air-gapped case makes position reporting impossible by definition.

### Resolved: follower writability (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a replicated repository
is read-only, replication is per repository, and local repositories sit alongside replicas on the
same instance. Accepted cost: a regional team cannot publish into a replica; it publishes into a
local repository on its instance, and a client wanting both composes them in a follower-defined
virtual repository. B lost because a writable replica gives one repository two writers, which is
the multi-leader problem the scope excludes, and forces its own snapshot numbering to coexist
with the replicated sequence; C lost because an instance-wide follower forbids the mixed-role
instance that makes regional deployments useful, for no correctness gain over per-repository
roles.

Folded into: Scope (per-repository replication, read-only replicas), Design (the read-only
section, with its shared-write-path enforcer), AC11, AC12, Phase 1.

The question as raised had a recommendation but no options table; the table below was written
in this pass so the adoption rests on the template's decision shape. A read-only follower is
simple to reason about; a follower that also hosts local publishes is far more useful for a
regional team, and immediately raises how its own snapshot numbering coexists with the
replicated sequence.

| Option | You get | It costs |
|---|---|---|
| **A. Read-only replicas; per-repository roles; local repositories alongside** | No repository ever has two writers; replica snapshot numbers are the leader's; one instance can lead some repositories and follow others | Writes to a replicated name must go to the leader or to a separate local repository; a misconfigured client gets an error rather than a local publish |
| **B. Writable followers with their own snapshot sequence overlaid on the replicated one** | A regional team publishes into the same name it pulls from | Two writers per repository, a numbering scheme that merges two sequences, and conflict semantics the scope explicitly refuses to define |
| **C. Whole-instance followers, read-only throughout** | Simplest to reason about: an instance is either a leader or a follower | No mixed-role instances, so a region needs a second instance for its own content; nothing gained over A in correctness |

**Why this is yours:** it is the boundary between replication and multi-leader, and the scope
above explicitly excludes conflict resolution.

### Resolved: virtual repositories (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: virtual repositories do
not replicate, and a follower composes its own from the repositories it has. Accepted cost: an
operator mirroring a leader's layout re-creates each virtual repository by hand, and the two
definitions can drift. B lost because it serves a silently incomplete aggregate under a name
clients trust, and adds configuration replication as a second mechanism beside snapshot
transfer.

Folded into: Scope (out of scope, by name), Design (the source section), AC13, Phase 1.

| Option | You get | It costs |
|---|---|---|
| **A. Not replicable; followers define their own virtual repositories** | Replication stays content-only; a follower can never serve a silently incomplete aggregate under a name clients trust | An operator mirroring a leader's layout re-creates each virtual repository by hand, and the two definitions drift over time |
| **B. Replicate the virtual definition, resolving only members present on the follower** | One action mirrors the client-facing URL a team actually points builds at | The follower silently serves a subset through the same name, a member added on the leader is invisible until config re-syncs, and configuration replication is a second mechanism beside snapshot transfer |

**Why this is yours:** it decides whether replication promises "the same bytes" or "the same
client-facing surface", and the difference is invisible until a member is missing.

### Resolved: proxied upstream content across an air gap (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: a freeze operation copies
a remote repository's cached content into a local repository as one ordinary publish, which then
replicates and exports normally. Accepted cost: the frozen copy is a real publish - it snapshots,
counts against retention and quota, needs a provenance record that is not a `RemoteFile`, needs
a handler ingest hook the pinned interface lacks, and makes `data-model.md` gain a write kind.
A lost because it abandons the most common air-gap workflow and leaves users to hand-publish
upstream packages with no provenance; C lost because it reverses `data-model.md`'s settled
position that proxied repositories create no snapshots, which keeps the hot proxy path off the
snapshot sequence.

Folded into: Context, Scope (freeze in scope; direct cache replication stays out), Design (the
freeze section), AC7 (freeze in the property operation set), AC14, AC15, Phases 0 and 4. The
metadata-derivation choice this exposed was raised as Q10 and is resolved below.

| Option | You get | It costs |
|---|---|---|
| **A. Unserved in v1, documented loudly: archives carry local repositories only** | No new mechanism anywhere | The flagship air-gap workflow is absent, and users will reproduce it by hand-publishing upstream packages into a local repository with no provenance |
| **B. A promote/freeze operation copies cached content into a local repository, which replicates normally** | Air-gap mirroring works as a composition of existing publish, snapshot and export machinery | The promoted copy is a real publish - it snapshots, counts against retention, and needs `RemoteFile` provenance semantics defined - and `data-model.md` must gain the operation |
| **C. Remote repositories gain snapshots for export** | Direct, no copy step | Reverses `data-model.md`'s resolved position that proxied repositories create no snapshots, which was settled to keep the hot proxy path off the snapshot sequence |

**Why this is yours:** every option either abandons the most common air-gap workflow or amends a
settled sibling decision, and the constitution says that choice is raised, never taken silently.

### Resolved: disaster-recovery takeover and fencing (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an explicit
per-repository operator command severs replication and makes the replica writable, with fencing
of the old leader a documented operator duty that the command makes the operator acknowledge.
Accepted cost: if the old leader keeps accepting writes, the histories diverge and reconciling
them is unsolved here; v1 detects the divergence (the identity decision, was Q9) rather than
preventing it. B lost because it leaves the DR use case in Context as a data-availability claim rather than
a capability. The operation is named "takeover" to keep it distinct from `data-model.md`'s pointer
promotion.

Folded into: Context, Scope, Design (the takeover section), AC16, AC17, Phase 3. With Q1 and Q2
it composes: a replica is read-only until takeover (was Q2), and followers re-attach to a new
leader through the ordinary delta-or-re-seed path (was Q1).

| Option | You get | It costs |
|---|---|---|
| **A. Manual promotion command; fencing is a documented operator duty** | DR is a real capability, with no coordination machinery built | If the old leader keeps accepting writes, the histories diverge, and reconciling them is explicitly unsolved here |
| **B. No promotion in v1: DR means an operator rebuilds from the follower's data by hand** | Zero new surface and no split-brain to mishandle | The DR use case in Context is overstated: the follower holds the data but cannot take over |

**Why this is yours:** it decides whether the DR use case is a capability or a data-availability
claim, and accepting a manually-fenced split-brain window is a risk posture only the owner can
sign.

### Resolved: instance-to-instance authentication (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an ordinary machine token,
whose `pull` scope on a repository also authorizes that repository's replication read surface.
Accepted cost: `pull` widens - a pull-scoped CI token can enumerate snapshot history and read
deltas, including content a hosted delete removed from the head that the leader still retains.
Derived, not chosen: a `pull` grant narrowed below the whole repository by `auth.md`'s path and
tag patterns does not authorize replication reads, since a delta exposes every path. B lost
because it amends `auth.md`'s settled vocabulary, chosen to match OCI's scope grammar with no
translation layer, to buy least privilege for a credential that can read nothing a full-repository
pull cannot already serve at the head.

Folded into: Scope, Design (the authentication section, with its architecture-test enforcer),
AC18, Phases 0 and 1. The recording of this widening belongs in `auth.md`, which owns the
vocabulary.

| Option | You get | It costs |
|---|---|---|
| **A. Ordinary machine token; `pull` grants replication reads** | One credential model; `auth.md` untouched | `pull` silently widens: any pull-scoped CI token can now enumerate snapshot history and deltas, which is more than "download artifacts" |
| **B. A new `replicate` action in the scope vocabulary** | Least privilege stays explicit and auditable | Amends `auth.md`'s settled vocabulary, which was chosen to match OCI's scope grammar with no translation layer |

**Why this is yours:** both options touch a settled sibling decision - widening what `pull`
means, or amending the vocabulary - and the constitution requires that to be decided in
daylight.

### Resolved: archive trust root (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: export prints the
manifest digest, and import requires it as a mandatory argument carried out of band. Accepted
cost: the root is only as strong as the operator's channel discipline, and a digest carried on
the same medium as the archive verifies nothing, which the operator guide states plainly. B lost
for v1 because it introduces a class of instance key - generation, rotation, pinning and
distribution - that no spec owns yet. If the owner later reverses to B, the key belongs to the
shared signing infrastructure that `write-triggered-services-prototype.md` is establishing for
signed indexes and that a future signing-service spec will own, not to this package.

Folded into: Scope (instance-key signing out of scope), Design (the export section's trust-root
bullet), AC19, Phase 2.

| Option | You get | It costs |
|---|---|---|
| **A. Mandatory out-of-band manifest digest at import** | Tamper detection with zero key management | Only as strong as the operator's out-of-band channel discipline; a digest sent alongside the archive on the same medium verifies nothing |
| **B. Leader signs the manifest with an instance key; the follower pins the public key** | Mechanical verification that survives careless operators, and a foundation for leader identity generally | A new class of key that `auth.md` does not own: generation, rotation, pinning and distribution UX all appear |

**Why this is yours:** it sets the supply-chain posture of the one path where transport security
protects nothing, and trading key management against operator discipline is a product-risk
call.

### Resolved: which pointers replicate (was Q8)

Raised and adopted in this pass: folding Q2 and the fifth-root paragraph exposed that the spec
tracked "a leader repository's snapshot number", a single-pointer model, while serving resolves
through several named pointers per repository (`data-model.md`).

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the leader's whole
pointer set replicates. Accepted cost: a follower transfers and pins every distinct snapshot the
leader's pointers target, including environment targets the leader has pinned outside its window,
so a follower's storage tracks the leader's pointer hygiene. B lost because a regional build
pointed at `prod` would get the head's content or nothing, which breaks the bit-identical promise
promotion exists to make.

Folded into: Scope, Design (the pointer-set section; the GC and retention sections), AC1, AC2,
AC7, AC8, AC10, AC20.

| Option | You get | It costs |
|---|---|---|
| **A. Mirror the whole pointer set** | Every name a client resolves on the leader resolves identically on the follower, environments included | The follower pins every snapshot the leader's pointers target, so a forgotten leader environment pointer costs storage on every follower too |
| **B. Mirror the default pointer only** | Smallest transfer; one position per repository | Environment names are absent or wrong on the follower, and promotion's bit-identical guarantee stops at the leader |

**Why this is yours:** it decides whether replication promises the leader's content or the
leader's whole client-facing name surface, and it multiplies pinned storage across followers.

### Resolved: detecting a divergent history (was Q9)

Raised and adopted in this pass: folding Q5 exposed that a takeover, or a leader restored from an
older backup, can produce two different snapshots under one number, and numbers alone would let a
follower apply across the fork.

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: each snapshot carries a
chained identity (a digest over its number, its delta's digest and its predecessor's identity),
the identity record outlives pruning, and a follower compares identities before applying.
Accepted cost: one retained identity row per completed write, forever, and a sibling amendment
to `data-model.md` to hold it. B lost because it makes a split brain silent, the failure shape
AC6 exists to forbid; C lost because takeover-minted epochs catch takeover forks only and miss a
leader restored from backup.

Folded into: Scope, Design (the identity section; the takeover and export sections), AC9, AC10,
AC16, AC17, Phase 1.

| Option | You get | It costs |
|---|---|---|
| **A. Chained per-snapshot identity, retained after pruning** | Any fork is detected at any distance, including after the forked content is pruned | An identity row per write kept forever, and a `data-model.md` amendment |
| **B. Snapshot numbers only; rely on fencing** | No new record | A split brain or a restored leader is applied silently, mixing two histories under one name |
| **C. Takeover-minted lineage epochs** | Small: one record per takeover | Misses forks no takeover created, such as a leader restored from an older backup |

**Why this is yours:** it trades a permanent per-write record against whether a DR mistake can
corrupt followers silently.

### Resolved: how freeze derives metadata (was Q10)

Raised and adopted in this pass: folding Q4 exposed that "copy cached content into a local
repository" leaves open whether the local repository's metadata is built by its handler or copied
from the cached upstream documents.

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: freeze is a publish
through the target repository's hosted ingest path, and its handler renders the local metadata.
Accepted cost: upstream-signed indexes are not preserved byte for byte - a frozen Debian mirror
serves a `Release` signed by this instance's signing service, so clients in the gap trust that key
rather than the upstream's - and freeze waits for an ingest hook at `format-handler-interface.md`'s
re-open. B lost because an upstream index lists everything upstream offers while a freeze holds
only what was cached, so a verbatim copy advertises files the repository cannot serve, and
because it would put metadata into a local repository that its own handler never produced.

Folded into: Design (the freeze section), AC14, Phases 0 and 4.

| Option | You get | It costs |
|---|---|---|
| **A. Publish through the hosted ingest path; the handler renders metadata** | Frozen metadata lists exactly what is held, and every publish-path check applies | Upstream signatures on indexes are replaced by the instance's; needs an interface hook at the re-open |
| **B. Copy the cached upstream metadata documents verbatim** | Upstream-signed indexes survive intact | Indexes advertise uncached files that 404 in the gap, and a local repository serves metadata its handler never produced |

**Why this is yours:** it decides whose signature an air-gapped client trusts for frozen content,
and whether freeze waits on an interface re-open.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-23 | d078c46 | first review: adversarial + constitution + cross-spec (data-model's delta/checkpoint representation and repository types, storage-and-gc's four mark roots and single-writer machinery, auth's missing instance identity) + go-spec-reviewer; claim verification vacuous pre-code (no `internal/replication/` exists) | Transfer unit corrected for the delta-plus-checkpoint representation (contiguous deltas vs checkpoint-based seed, reconstructibility on the follower), follower GC bound to all four roots and the shared reference-creation and intent machinery, remote repositories excluded as sources, follower retention clock and served-snapshot protection stated, archive contiguity/atomicity/idempotence specified; AC2 moved to fault injection and made consistent with AC3, AC5 hardened, AC7 extended to the fourth root and transfer interleavings, AC8-AC10 added; Q3-Q7 raised (virtual repositories, air-gapped proxied content, DR promotion, instance-to-instance auth, archive trust root); stays draft |
| 2026-09-26 | 2edd42c | folding owner answers to storage-and-gc Q10 and proxy-cache Q11 | Not a review, and this spec is only a consequential update: the decision's home is `storage-and-gc.md`. Context, the follower-GC bullet and AC7 carried from four mark roots to five. The fifth root does cover a follower: a replication pointer targets a snapshot exactly as an environment pointer does, so the follower's served snapshot and its reconstruction chain are exempt from the follower's own pruning while targeted, which turns the previously replication-local 'the served snapshot is never pruned' rule into an instance of the shared root, released when replication advances the pointer. Scoped explicitly to the follower's store: what a leader may prune while a follower is behind is Q1, which the root set does not answer and which stays open along with Q2-Q7. |
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a gate review. Adopted Q1 A (leader prunes consulting no follower; follower detects the gap from the leader's advertised retained ranges and re-seeds, fetching blobs by want-list so held blobs are never re-sent), Q2 A (read-only replicas, per-repository roles, mixed-role instances; options table written first, the question had none), Q3 A (virtual and remote sources refused; followers compose their own virtuals), Q4 B (freeze: one publish of cached content into a local repository, provenance not as `RemoteFile`, never contacts upstream), Q5 A (per-repository takeover command gated on an explicit fencing acknowledgement, numbering and identity continue), Q6 A (ordinary machine token, `pull` authorizes the replication read surface; derived: a pattern-narrowed `pull` does not), Q7 A (mandatory out-of-band manifest digest at import). Folding exposed three judgment calls, raised and adopted as Q8 A (the whole pointer set replicates, not only the head, which the spec's single-number tracking had silently assumed), Q9 A (chained per-snapshot identity retained past pruning, so a split brain or restored leader is detected rather than applied) and Q10 A (freeze publishes through the hosted ingest path and the handler renders metadata). Body rewritten through Context (build order deferred to the charter), Scope, every Design section (new: pointer set, identity, read-only, freeze, takeover, authentication; retention section rewritten to the adopted option), and Phases (Phase 0 sibling prerequisites; Phase 3 is now takeover, Phase 4 freeze). AC1, AC2, AC5-AC10 rewritten to assert the adopted behaviour (AC6 no longer an either-or); AC11-AC20 added, each with a Test Plan row, AC18 with two. Sibling amendments needed in `auth.md`, `data-model.md`, `format-handler-interface.md` and, text only, `storage-and-gc.md`; none made here. Stays draft. |
