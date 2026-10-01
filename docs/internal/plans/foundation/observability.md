---
status: planned
status_description: "Fable follow-up round 2, 2026-10-01 at 16da951, still planned: the four items queued since round 1 applied and verified against their sources (osv as the default feed's source and schedule value on the two policy_advisory_feed_* rows, the schedule paragraph and the policy.feed.import row; the most-overdue fold over enabled rows with a derived-next-run kind's period next_run_at - last_run_at, on AC5 and its metrics_test.go row; HijackReporter cited as applied in format-handler-interface, the reported size the body's length, a reporterless chain tolerated by the writer and guaranteed absent here, FHI AC14's single-call-site assertion on AC30's row; server_address also a realm host or a credential kind's fixed endpoint, with the ECR account id named in the disclosure); two declined as already applied or not this spec's; 31 criteria, zero open; two sibling consequences reported. Earlier: Fable follow-up 2026-10-01 at a27dea9, still planned: the six items queued since the recheck applied and verified against their sources (a PodMonitor, never a ServiceMonitor; the disclosure statement covering every configuration-bounded label with name_label_limit: 0 as the opt-out, server_address now capped with upstream, and the schedule label fixed to a kind or a kind with a source or link name, scoped kinds folded to their most overdue row, as Q9 raised and adopted owner-facing; auth.session.issue, .end and .refused registered with the rate limit on the four refusal events and the credential row aligned to credential-management AC18; index_requested_cells{repository} in the catalogue; the WithJob sentence a citation of async AC27); 31 criteria, nine questions resolved, zero open; four sibling consequences reported. Earlier: Planned by the Fable recheck of 2026-10-01 at 4fcbbd4: a full review pass over the cloud-authored whole (claim verification of every sibling citation at HEAD, adversarial lens at full strength, constitution compliance, go-spec-reviewer inline) plus the re-examination of the eight questions adopted without Fable. Verdicts: Q4 confirmed; Q1, Q2, Q3, Q5, Q6, Q7 and Q8 confirmed and amended (the exporter translation pinned concretely; the alert Error record once per minute with suppressed; a stream attribute on every record and the recorder failing a test on a rejected emission; the repository-name disclosure stated and made the reason the telemetry listener is never public, with repository_label_limit: 0 as the opt-out; a configuration-bounded label never taken from the request; the benchmark gate refusing a threshold tighter than the baseline's variance; no url.query on the request span). None superseded. Brought current first: cache_metadata_bytes{repository} with the dual-held rule and a rule-only CacheMetadataLarge; the middleware ResponseWriter wrapper as a Hijacker accepting WriteRefusal's reported status and size (new AC30); AdvisoryFeedDegraded on the last completed sync or declared export time, per source; replication.link.sync, .reseed and policy.feed.import registered; every-write-past-the-authorizer wording from management-api AC23 and credential-management AC18; the replay labelled by job kind and absent principal, never the marker (new AC31). Refuted and fixed: the authorizer listed in Deps, two counters used by criteria and rules but absent from the catalogue, a histogram _count AC17 forbade, a replication listener that does not exist, MarkSecret on an immutable context, Secret without an accessor. 31 criteria, each with a Test Plan row; zero open questions; fable_recheck cleared. Eight sibling consequences reported. Earlier: closing reconciliation 2026-09-28 at 1848c7d on Opus (unbound_hosts, the replication and policy.rule.update events confirmed); reconciled 2026-09-28 at ff7966e with the foundation authoring wave; authored 2026-09-27 at 677aa69 as a grounded first draft with eight decisions adopted under the standing delegation."
description: "Spec for the observability baseline: one metric catalogue with a naming convention and mechanically enforced cardinality bounds, structured operational and request logs with credential redaction at the handler, a separate audit channel for security-relevant events with a closed event vocabulary, OpenTelemetry tracing across the request, Deps and storage boundaries with W3C propagation and X-Request-Id correlation, health and readiness endpoints, a named alert catalogue shipped as Prometheus rules, and the shared CI benchmark-gate mechanism the sibling specs' benchmark criteria run on."
author: michielvha
goal: "Make every failure the constitution says has no client oracle visible to an operator before a user reports it: no metric without a bounded label set, no log line that can carry a credential, no security-relevant event outside the audit channel, no request without a correlation id, and no alert that is only a log line."
priority: "critical"
issue: 51
created: 2026-09-27
covers:
  - "internal/telemetry/**"
  - "scripts/bench-gate.sh"
  - ".github/workflows/**"
---

# Plan: Observability

One package, `internal/telemetry`, owns every signal this registry emits: the metric catalogue
and the instruments behind it, the operational and request logs and the redaction that guards
them, the audit channel, the tracer and its propagation, the health and readiness endpoints, the
alert catalogue shipped as rules, and the benchmark-gate mechanism that turns the sibling
specs' "CI fails on a regression" criteria into a job that can actually fail. Every other
package receives typed instrument handles and a `*slog.Logger` from it and constructs nothing
of its own, which is what lets one test hold the whole signal surface to one convention.

## Context

`project-charter.md` places the **observability baseline at build step 2**, with the generic
format, the management surface core and the configuration and deployment baseline, and gives the
reason in the step's row: "the fault-injection and benchmark evidence of steps 3 and 4 needs
signals that exist before the components they observe, since concurrency, durability and
performance have no client oracle (`CLAUDE.md`)". The charter's cost-line list names
`shared:observability` as this subsystem's ledger line, and its Phase 1 (steps 1 to 3) cites
this spec's Phase 1, the benchmark-gate mechanism included, as what the generic format needs to
run; its Phase 2 places this spec's Phase 2 storage half with the CAS and GC. That
placement is the reason this spec is a foundation spec rather than a late addition: the
constitution says concurrency and durability failures, architecture failures and performance
failures are the three ways to ship something that passes every conformance case and is still
broken, and each of them is discovered, if at all, through a signal this spec defines.

The current tree has no `internal/` directory and a stub `cmd/stackweaver-registry/main.go`
(`find . -name "*.go"` at 677aa69 lists only that file), so every claim below about code is a
design claim, and every claim about a sibling's requirement cites the sibling.

### Who depends on this spec, and for what

The requirements below were gathered by grepping `docs/internal/plans` for `metric`, `gauge`,
`alert`, `audit line`, `slog`, `X-Request-Id` and `observab`, and re-verified on 2026-09-28
against each sibling's current text, which now asserts these names in its own criteria rather
than owing them to this file. Each is asserted by a criterion in this spec; the table says which.

| Citing spec | What it places on this spec | Where |
|---|---|---|
| `credential-management.md` (its AC5, AC18, "Token expiry") | The gauge `credentials{state,owner_kind}` with the informational `CredentialsExpiring` alert (its AC5); the token value in no log line, metric or error body (its AC4); one audit line per request that passes the shared authorizer on its routes, reads and listings included (the channel's one read exception, stated there), none for a request the authorizer refuses, carrying `event`, `request_id`, `principal`, `credential`, `owner`, `outcome`, `problem_type`, under the `credential.token.*`, `credential.robot.*`, `credential.key.*`, `credential.trust.*` and `credential.exchange` events (its AC18 as amended on Fable 2026-10-01); `X-Request-Id` echoed (its AC15) | AC6, AC12, AC16, AC19 |
| `signing-service.md` (its "Observability" paragraph, AC14, AC15, AC17, AC19, AC22, AC35) | The `signing_*` and `index_*` series by this catalogue's names; the alerts `SigningFailed`, `SigningDocumentExpiring`, `VirtualMergeFailed`, `VirtualMergeStalenessBreach`; the `signing.key.*` audit events; private material in no log line or metric label (its AC14); the `external` key expiry alert at `signing.external_expiry_lead` (its AC22); the gauge `index_requested_cells{repository}`, a virtual's read-driven cell set against `index.requested_cells_max`, so a virtual at its cap is visible (its resolved requested-cell decision, was Q22, and AC35) | AC6, AC12, AC18 |
| `upstream-adapters.md` (its AC31, AC4, AC20) | Exactly the six `upstream_*` series by this catalogue's names, `upstream` always the configured name, never a URL, with `UpstreamRateLimitLow` and `UpstreamCooldown` (its AC31); that name is operator-chosen and bound to a remote, so it discloses on the telemetry listener as `repository` does (its Fable recheck of 2026-10-01; Design, "The telemetry listener"); no `traceparent` or `tracestate` on an outbound request (its AC4); every log line and error passes its redactor (its AC20) | AC5, AC6, AC9, AC18, AC20 |
| `async-operations.md` (its AC20, AC14, AC26, AC27, AC30) | The `async_*` series by this catalogue's names and the merge worker's `index_virtual_merge_staleness_breaches_total`; the alerts `JobFailed`, `ScheduleOverdue`, `VirtualMergeStalenessBreach` and `SchedulerLeaderless`, each once per driving scenario (its AC20); the leader runs the state-gauge collector (its AC14); a skipped unknown-kind job still counts in `async_jobs{kind}` (its AC26); `trace_context` and `request_id` recorded at enqueue with a span link, and one `telemetry.WithJob` call per claim before `Work` (its AC27, its "Claim"); no job receives a principal from the queue, so a record emitted under a job carries none (its AC30); schedules per pointer, per repository, per source and per link (its "The scheduler"), which fixes what the `schedule` label may carry (Design, "Cardinality") | AC5, AC6, AC7, AC16, AC18, AC31 |
| `proxy-cache.md` (its AC10, AC13, AC14, AC29, "What ends a cached reference's life") | The `cache_*` series by this catalogue's names: utilisation as `cache_referenced_bytes` over `cache_quota_bytes` (`CacheQuotaNearFull`), thrash as `cache_refetch_after_eviction_total` over `cache_evictions_total` (`CacheThrash`), `cache_fetch_failures_total{format,condition}` with `FetchIntegrityFailure`, one `cache_condemnations_total` increment, one `CachePurgedOnSignal` and one `cache.purge` audit event per condemnation, `cache_divergences_total` with `UpstreamDivergence`; `cache_metadata_bytes{repository}` for a remote's current and retained metadata outside the quota, the only signal of the operator's only lever (its resolved metadata-eviction decision, was Q21, and AC29), a cached file a declared list of the remote also holds counted there and not in `cache_referenced_bytes` while declared (`rpm.md` was-Q11 as folded into its AC14 and AC29) | AC6, AC12, AC18 |
| `storage-and-gc.md` (its "Observability" section, AC19, AC21, AC22, AC28) | The `gc_*` and `storage_*` series with exactly this catalogue's names and labels, moving under a driven sweep, cancelled intent, aged pin, aborted read and expired session, with `GCSweepStale` (twice `gc.sweep_interval`), `PinnedStorageOutOfWindow` and `BlobDigestMismatch` evaluating true in those states (its AC28); the read-path digest verification that increments `storage_blob_digest_mismatches_total{format}` once per aborted read (its AC21) under a `// gate:` budget (its AC22) | AC6, AC18, AC25 |
| `supply-chain-policy.md` (its AC5, AC6, AC9, AC16, AC18, AC25) | `policy_refusals_total{format,condition}` and the `policy.refusal`, `policy.condemnation` and `policy.rule.update` audit events (its AC5), the last also on a `coordinate_exemptions` change (its AC25); `policy_unscanned_past_bound` as the input of `ArtifactUnscannedPastBound` past `policy.scan.unscanned_alert_after` (its AC6); the operator alerted when a source's freshness, the completion of its last successful sync or the export time its import declared, is older than `policy.feed.staleness_threshold` (its AC9 and its resolved freshness-measure decision, was Q13; `AdvisoryFeedDegraded`); the `policy.feed.import` audit event on the local import (its AC16); a hijacked refusal write counted in `http_server_request_duration_seconds` and present in the request log exactly as a non-hijacked response would be, which needs this middleware's `ResponseWriter` wrapper to be a `Hijacker` and to accept the status and size the writer reports (its AC18 as extended on Fable 2026-09-30) | AC6, AC12, AC18, AC30 |
| `replication.md` (its AC10, AC21, "What a monitor sees") | The four `replication_*` series, the one-hot link state over six values, the four alerts `ReplicationLinkFailed`, `ReplicationReseeding`, `ReplicationDiverged`, `ReplicationLagHigh`, the `replication.*` audit events carrying `link` and `leader` (`replication.link.sync` and `.reseed` named by `management-api.md`'s endpoint table on Fable 2026-09-30 for this spec and `replication.md` to register), and trace propagation to the leader so one trace spans both instances (its AC10); a linked follower signs nothing, so `signing_*` series stay flat on it for a replicated repository (its AC21) | AC6, AC12, AC18, AC20 |
| `management-api.md` (its AC23, AC33, AC34; "Audit: the `Operation` record and the audit line") | The audit line as a structured `log/slog` record with a fixed attribute set, emitted through `telemetry.Auditor.Emit`, surviving the `Operation` prune, credential-free, sharing `request_id` with the `Operation`; one line for every write past the shared authorizer under a registered event, none for a read and none from that surface for an authorizer refusal (its AC23 as amended on Fable 2026-09-30); `replication.link.sync`, `replication.link.reseed` and `policy.feed.import` named for registration here (its endpoint table, AC33, AC34); `X-Request-Id` on every response, echoing the client's when sent | AC12, AC14, AC16 |
| `auth.md` (its AC7, AC15, AC36, AC37, "Audit events") | A token or password never in logs, error responses or metrics, asserted on a real success and a real failure; the first-start admin credential emitted exactly once by design; the revalidation replay carries no principal and its marker is a context value no package outside the composition root can read (its AC36), so nothing here labels a replay by the marker; the six `auth.*` audit events named in its "Audit events" (the three refusal events and, from its Fable follow-up of 2026-10-01, `auth.session.issue`, `.end` and `.refused`), the four refusal events rate-limited per client address per minute (its AC37) | AC9, AC10, AC11, AC12, AC31 |
| `format-handler-interface.md` ("The pinned method set", AC14, AC18) | `Deps` carries "the request logger" and no authorizer (corrected there 2026-10-01); a handler holds no capability it was not handed; shared-layer routes need reserved mounts (its AC11); `WriteRefusal` hijacks on HTTP/1.1, emits the pre-set headers and reports its status and the body's length exactly once to the first `HijackReporter` on the `Unwrap` chain, tolerating a chain with none, so this middleware's wrapper must be reachable as a `Hijacker` and be that reporter (its AC14); the replay entry dispatches a handler below the router with a discarding writer, a marker unreadable outside the composition root and no principal (its AC18) | AC3, AC15, AC22, AC30, AC31 |
| `deployment.md` (its AC13, AC27) | The telemetry listener bound only to `telemetry.listen`, never on the chart's Service or Ingress, scraped when wanted by a `PodMonitor` on the container port and never a `ServiceMonitor`, which is what makes repository names as label values acceptable on it (its AC13); `alerts.yaml` installed as a PrometheusRule with its templated values (its AC27) | AC17, AC23 |
| `artifact-verification.md` (its AC26, AC27) | `verify_verdicts_total{scheme,state}`, `verify_duration_seconds{scheme}`, `verify_reevaluation_pending`; `VerificationFailed` on a `failed` verdict at ingest or cache commit (its AC27); the ingest-overhead benchmark under the shared gate (its AC26) | AC6, AC18, AC25 |
| `repository-lifecycle.md` (its AC27, AC28) | The `repository.*` audit events with `repository_id` on every record, `repository.rename` carrying `previous_name` and `unbound_hosts` (its resolved hostname-binding decision, was Q10); the leader-exported gauge `repositories{format,repository_kind,state}` | AC7, AC12 |
| `data-model.md` (its AC41) | `Job.trace_context` and `Job.request_id` set at enqueue and equal to the enqueuing request's | AC16 |
| `conformance-harness.md` (its AC13) | Corpus redaction is an allowlist; the harness's server-log assertions are not protocol-observable and live in integration tests | Scope, AC9 |
| Format specs (alpine, arch, cpan, hackage, homebrew, luarocks, opam, openvsx, puppet, rpm, terraform, vagrant) | "No credential appears in logs, error bodies or metrics" for path tokens, vendor headers and capability URLs; "the real failure reason is recorded observably to the operator" | AC9, AC11, AC18 |
| `CLAUDE.md` ("Performance is invisible to conformance. Benchmarks are CI gates") and `project-charter.md` AC6 | A CI benchmark gate that fails the build on a regression beyond a stated threshold | AC24, AC25 |

Two things nobody asked for are here because the constitution demands them: **every boundary
rule needs a named mechanical enforcer** (this spec introduces four), and **acceptance criteria
state the end state**, so "quota utilisation is observable" becomes a named gauge with a named
label set that a test reads off `/metrics`.

### Prior art, and what is taken from it

Gathered in this run by fetching the sources named; nothing here rests on recollection.

- **OpenTelemetry semantic conventions.** `http.server.request.duration` (histogram, seconds,
  stable) with required `http.request.method` and `url.scheme`, conditionally required
  `http.response.status_code`, `http.route` and `error.type`, and the rule that `http.route`
  "MUST NOT be populated when this is not supported" and must be low-cardinality with dynamic
  segments as placeholders; `http.client.request.duration` with required `server.address` and
  `server.port`; unknown methods collapse to `_OTHER`. Database: `db.client.operation.duration`
  (stable, seconds, required `db.system.name`, conditionally `db.operation.name`,
  `db.collection.name`, `db.response.status_code`) and the connection-pool set
  (`db.client.connection.count` with `pool.name` and `state`, `pending_requests`, `timeouts`,
  `wait_time`, `use_time`). **Taken** wholesale for the HTTP server, HTTP client (upstream) and
  database layers: these are the names every dashboard and collector already understands, and
  inventing registry-flavoured synonyms buys nothing. The default HTTP bucket boundaries stop at
  10 s, which is wrong for a server that streams multi-gigabyte blobs; **rejected** in favour of
  an extended boundary set (Design, "Histogram boundaries").
- **Prometheus naming.** An application prefix, one unit per metric in base units (seconds,
  bytes), `_total` on counters, `_info` for metadata, timestamps as `_timestamp_seconds`, labels
  for characteristics rather than for anything already in the name, and never a label whose
  values are user ids or the like. **Taken** as the rendering convention for everything on
  `/metrics`. The OTel Prometheus exporter performs this translation deterministically (dots to
  underscores, unit suffix, `_total` on counters, `target_info` and `otel_scope_info` metadata),
  which is why this spec can state both the OTel name and the Prometheus name for each metric
  without them drifting.
- **Harbor.** Exposes `harbor_project_quota_usage_byte` and `harbor_project_quota_byte` per
  `project_name`, `harbor_up{component}`, `harbor_task_queue_size` and
  `harbor_task_queue_latency` per job type, `harbor_jobservice_task_total{status,type}`, and
  the distribution registry's `registry_http_requests_total{code,handler,method}` and
  `registry_storage_action_seconds{action,driver}`; metrics live on a separate port and path
  configured in `harbor.yml`. **Taken:** per-project (here per-repository) quota gauges are
  exactly the "quota utilisation observable" `proxy-cache.md` asks for, and the component-up
  gauge is the readiness mirror this spec ships; a separate metrics listener is taken too.
  **Rejected:** the `registry_` prefix, because a Harbor installation beside this registry would
  collide on it; and Harbor's summaries with quantile labels for latency, because summaries
  cannot be aggregated across replicas and histograms can.
- **Artifactory.** Open Metrics are off by default and enabled by a property
  (`artifactory.metrics.enabled`), served on an authenticated API path
  (`/artifactory/api/v1/metrics`), and JFrog's own Prometheus integration derives further series
  from the request, access and audit log files. **Taken:** the separation of an access log, an
  operational log and an audit log into distinct streams. **Rejected:** deriving metrics from log
  files, which is a workaround for a server that did not export them, and metrics off by default,
  which hides exactly the signals step 2 exists to provide.
- **Nexus Repository.** `/service/rest/metrics/prometheus` (from 3.81; `/service/metrics/prometheus`
  before) behind the `nx-metrics-all` privilege, plus `/service/metrics/healthcheck`. **Taken:**
  a health endpoint distinct from the metrics endpoint. **Rejected:** privilege-gating the scrape
  on the client-facing listener; this spec puts the scrape on a listener the operator does not
  expose rather than on a route a registry token could reach (the resolved listener question).
- **Gitea.** A `[metrics]` section with `ENABLED` and a bearer `TOKEN` for `/metrics`, an access
  log template, and `REQUEST_ID_HEADERS` naming which request headers are copied into the access
  log as the request id. **Taken:** an explicit request-id header policy. **Rejected:** trusting
  any header the client names without validation; the request id this spec echoes is validated
  or replaced (Design, "Request id and trace context").
- **Pulp.** OpenTelemetry, disabled by default, exported over OTLP to a collector, recording API
  latency by method, URL, status and worker, content-delivery latency, disk usage per domain and
  artifact sizes served per domain; a `status` endpoint for health. **Taken:** OTLP export as the
  trace path and traces off by default; content-delivery latency as its own histogram, separate
  from API latency. **Rejected:** URL as a metric attribute, which is unbounded.
- **Go `log/slog`.** `Handler` with `Enabled`, `Handle`, `WithAttrs`, `WithGroup`; `LogValuer`
  whose documented use is exactly secret redaction (a `Token` type whose `LogValue` returns
  `REDACTED_TOKEN`); `HandlerOptions.ReplaceAttr` to rewrite or drop attributes; `JSONHandler`
  rendering groups as nested objects; the recommendation to pass a context to every output
  method. The vendored `go` skill adds: never a package-level logger beyond `main`, pass
  `*slog.Logger` as a dependency, log at the boundary and return the error through the stack.
  **Taken** entirely; the redaction design is three `slog` mechanisms layered.
- **W3C Trace Context.** `traceparent` as `version-trace-id-parent-id-trace-flags`, a missing or
  invalid header meaning "start a new trace and drop `tracestate`", `tracestate` forwarded
  unchanged unless deliberately mutated. **Taken** as the inbound propagation format and as the
  outbound one for replication peers only (the resolved propagation question).

## Scope

**In scope**

- The metric catalogue: every metric this registry exports, with OTel name, Prometheus rendering,
  instrument type, unit, label set and the bound on each label, in one Go table that the
  `/metrics` output is tested against, and the naming and cardinality rules that admit a new
  entry.
- Typed instrument handles per subsystem, constructed only in `internal/telemetry`, so that a
  sibling package cannot create an instrument or pass an unbounded label value.
- The operational log, the request log and the audit log as three `slog` streams with fixed
  schemas; the redaction design (typed secrets, key denylist, per-request secret scrubbing, URL
  redaction) and the single sanctioned disclosure (`auth.md` AC15).
- The audit channel: its sink, its schema, the closed event vocabulary and the rule for adding an
  event.
- The alert mechanism (a named condition is a counter, an `Error`-level record and a shipped
  Prometheus rule) and the alert catalogue gathered from the siblings.
- Tracing: the request span, child spans at every `Deps` boundary and the database and blob
  store, span linking across the async queue, sampling, OTLP export, and the propagation policy.
- `X-Request-Id`: validation, generation, echo on every response of every listener, correlation
  with the audit line and the `Operation` record.
- `/healthz` and `/readyz`: what each checks, what each reveals, and on which listener.
- Multi-replica semantics: which gauges are process-local and which are derived from shared state
  and exported by the scheduler leader alone.
- The `telemetry.*` configuration keys, as this subsystem's policy; `deployment.md` carries them
  in its key inventory (the `telemetry.` row, 17 keys) and its two-way check holds the two equal.
- The shared benchmark-gate mechanism (`make bench`, checked-in baselines, comparison,
  threshold, the CI job) and this package's own overhead budgets.
- Four mechanical enforcers: the SDK-import boundary, the handler-import boundary, the
  context-logging lint, and the `Deps` decorator completeness test.

**Out of scope, with reasons that are not effort**

- **A built-in notifier (email, webhook, chat).** Alertmanager, Grafana and every SIEM already
  route alerts from rules and logs; a second router inside the registry would have to be
  configured, secured and tested for delivery, and it would duplicate a solved problem while
  adding a network egress path to a component the constitution wants to keep narrow. Alerts here
  are conditions that a rules engine fires; the resolved alert-mechanism question records this.
- **Log storage, rotation and retention.** Logs go to standard output and, for the audit channel,
  optionally to a file; what collects, rotates and retains them is the deployment's, because the
  right answer differs between a container platform and a systemd unit, and the registry cannot
  know which it is in.
- **Dashboards.** A Grafana dashboard has no oracle beyond JSON validity, so shipping one here
  would add an untestable artefact to a spec whose whole point is testable signals. The rules
  file ships here because its correctness is checkable against the catalogue; a dashboard that
  reads the same catalogue belongs to `deployment.md`'s packaging.
- **Per-user or per-principal metrics.** A principal is an unbounded label value (the Prometheus
  guidance's own example), and per-principal accounting is a management-API listing over the
  `Operation` record and the audit log, not a time series.
- **Business metrics per package or per version** (downloads per package, most-pulled artifacts).
  Package names are unbounded and are exactly the label the cardinality rule forbids; download
  counts, where a format's protocol needs them (npm's download API is out of scope in `npm.md`
  as well), are a metadata-document concern, not a metric. Harbor's `harbor_artifact_pulled` per
  project is the bounded form and is covered by the per-repository request counter.
- **Client-side telemetry** (what a real `docker` or `npm` reports). The client is the
  specification; this registry observes only its own side of the exchange.
- **The corpus redaction of the conformance harness** (`conformance-harness.md` AC13). It is an
  allowlist at capture time over recorded traffic; the redaction here is over emitted logs. They
  share the list of credential shapes (Design, "Redaction") and nothing else.

## Design

### Package shape and the four boundaries

`internal/telemetry` is one package with one job: construct and hand out the signal surface.
Its exported surface, small on purpose:

- `New(cfg Config, build BuildInfo) (*Telemetry, error)`: builds the meter provider with the
  Prometheus exporter, the tracer provider with the configured exporter, the three loggers, the
  health registry and the alerts. `Telemetry.Shutdown(ctx)` flushes exporters; every goroutine
  it starts (the state-gauge collector, the exporter batchers) exits on that call, which is its
  stated shutdown path.
- `Telemetry.Logger() *slog.Logger`: the operational logger. `Telemetry.Audit() *Auditor`: the
  audit channel. `Telemetry.Metrics() *Metrics`: the typed instrument handles, one field per
  subsystem (`Metrics.HTTP`, `Metrics.Cache`, `Metrics.Upstream`, `Metrics.Storage`,
  `Metrics.GC`, `Metrics.Async`, `Metrics.Signing`, `Metrics.Auth`, `Metrics.Credentials`,
  `Metrics.Policy`, `Metrics.Verify`, `Metrics.Replication`, `Metrics.Repositories`,
  `Metrics.Manage`), each a struct of methods with typed parameters (Design, "Cardinality").
- `Telemetry.Middleware(next http.Handler) http.Handler`: the request middleware, one per
  listener, doing request id, span, request log, HTTP metrics and per-request secret scrubbing
  in that order. It is this package's own middleware rather than `otelhttp`, because it also
  owns the request id, the request log line, the secret set and the two labels (`format`,
  `listener`) the semconv instruments carry here, and because it must survive a hijack (next
  paragraph); `otelhttp`'s two-phase `http.route` read is copied, not imported.
- **The `ResponseWriter` wrapper** the middleware installs records the status code and body
  size for the log line, the histogram and the span. It implements `http.Flusher` (a streamed
  blob needs `Flush`), `http.Hijacker` and `Unwrap() http.ResponseWriter`, so both a direct
  type assertion and `http.NewResponseController(w).Hijack()` reach the connection through it,
  and it implements the one-method reporter interface `format-handler-interface.md` declares
  beside `WriteRefusal`, `format.HijackReporter` with `Hijacked(status int, size int64)` (its
  "The pinned method set" and AC14, applied there on 2026-10-01), which the writer finds as the
  first reporter on the `Unwrap` chain and calls exactly once, after the connection is written,
  with the status it wrote on the hijacked connection and the body's length, the same measure
  this middleware records as the response size of a written response, so a hijacked and a
  written refusal land in the same log field and histogram. The writer tolerates a chain with
  no reporter, since a lost sample must never cost a client its answer; the guarantee that a
  reporter is present on every chain is therefore this spec's, held by the middleware being one
  per listener and by AC30's compile-time assertion that the wrapper satisfies the interface.
  Once hijacked, the wrapper takes
  no further writes, the middleware completes the request from the reported values, and the
  request log line, `http_server_request_duration_seconds`, `requests_total` and the request
  span show the refusal exactly as they would a written response (AC30). Without this, every
  policy refusal on HTTP/1.1 would vanish from the metrics, `HighErrorRate` and the log, which
  `supply-chain-policy.md` AC18 and `format-handler-interface.md` AC14 both rely on this spec
  to prevent.
- `Telemetry.Instrument(deps format.Deps) format.Deps`: wraps every consumer interface in
  `Deps` with a tracing and metrics decorator (Design, "Tracing").
- `Telemetry.Health() *Health`: the readiness registry; `Handler()` for the telemetry listener,
  `Probe()` for the main listener.
- `MarkSecret(ctx, value)`, `Secret(value)`, `Disclose(value)`, `RedactURL(*url.URL)`,
  `Alert`, `WithJob(ctx, id, kind, requestID)` (Design, "Redaction", "Alerts", "Structured
  logging").

The consumer interfaces this package decorates are the ones `format-handler-interface.md` says
`Deps` carries: the blob store, the metadata store, fetch-and-cache, the `Verifier`, the
advisory reader, the host-binding lookup, the `Documents` serving door and the request logger
(its "The pinned method set"; there is no authorizer in `Deps`, a listing that spec corrected on
2026-10-01 and that an earlier draft of this spec had copied). Their signatures belong to the
specs that own the layers, and this spec adds no method to any of them. `Deps`'s "request
logger" is a `*slog.Logger` whose handler reads the request attributes from the context (Design,
"Structured logging"), so the interface `Deps` carries for logging is the standard library's.
The authorizer is not decorated here because it is not in `Deps`; its span (`auth.authorize`)
is produced inside `internal/auth` through the tracer handle (Design, "Tracing").

Four boundary rules, each with its enforcer, per the constitution's rule that a boundary held
only by review is not enforced:

| Rule | Enforcer |
|---|---|
| Only `internal/telemetry` imports the OpenTelemetry SDK and exporters (`go.opentelemetry.io/otel/sdk/**`, `go.opentelemetry.io/otel/exporters/**`), the OTel metric API (`go.opentelemetry.io/otel/metric`) and `github.com/prometheus/client_golang/**`. Every other package receives typed handles. | `internal/telemetry/boundary_test.go` walks `go list -deps` for every package under `internal/**` and `cmd/**`; plus a `depguard` rule in `.golangci.yml` so the failure is a lint failure before it is a test failure |
| No handler package (`internal/format/**`) imports `internal/telemetry`, the OTel API or `client_golang`. A handler's signals come from the middleware and the `Deps` decorators, and its log lines from the `*slog.Logger` in `Deps`. | The same `boundary_test.go`, and the `depguard` rule; `format-handler-interface.md`'s `internal/format/arch_test.go` asserts the same three imports are absent from every handler (its Deps paragraph, applied 2026-09-27) |
| Every `slog` call outside `main` passes a context, uses no global logger, and uses snake_case keys from the attribute vocabulary; no `fmt.Print*`, `log.Print*` or `println` outside `main` and tests. | `sloglint` in `.golangci.yml` with `context: all`, `no-global: all`, `key-naming-case: snake`, `static-msg: true`; `forbidigo` for the print families |
| Every consumer interface `Deps` carries has a decorator in `internal/telemetry` covering every method (a new method on a `Deps` interface without a decorator method fails the build, not a review). | `internal/telemetry/decorator_test.go`, reflecting over each interface in `format.Deps` and asserting the decorator type implements it and that every method starts a span (a fake inner implementation records the span in the context it receives) |

### Naming convention

Two families of metric names, deliberately, so that standard dashboards keep working and
registry-specific series are unmistakable:

- **Semantic-convention metrics** keep their OpenTelemetry names unprefixed:
  `http.server.request.duration`, `http.server.active_requests`,
  `http.server.request.body.size`, `http.server.response.body.size`,
  `http.client.request.duration`, `db.client.operation.duration`, `db.client.connection.count`
  and the rest of the pool set. On `/metrics` the exporter renders them as
  `http_server_request_duration_seconds` and so on. Go runtime and process metrics come from the
  standard collectors (`go_*`, `process_*`) on the same registry.
- **Registry-specific metrics** carry the OTel instrumentation scope `stackweaver.registry` and
  the Prometheus namespace `stackweaver_registry_`, followed by `<subsystem>_<measure>[_<unit>]`
  with the Prometheus unit and type suffixes. `registry_` alone is rejected because
  `distribution/distribution`, which Harbor embeds, already exports `registry_http_*`, and an
  operator running both would get a merged series. The subsystem word is one of the fourteen
  `Metrics` fields above, lower-cased (`http` is never used for a registry-specific metric; the
  semconv family owns it).
- **How the namespace is applied, pinned.** The prefix lives in the OTel instrument name
  itself (`stackweaver.registry.cache.referenced` with unit `By` renders as
  `stackweaver_registry_cache_referenced_bytes`), never in the exporter's `WithNamespace`
  option, which would prefix the semconv family too. The exporter is constructed with
  `WithoutScopeInfo()`, so no `otel_scope_name` or `otel_scope_version` label reaches a series
  (both would fall outside the closed attribute vocabulary), and `target_info` is the one
  exporter-generated series admitted beside the catalogue. The standard collectors' families
  (`go_*`, `process_*`, `promhttp_*`) are admitted by prefix and are not catalogue rows. AC4
  holds all of this: a library upgrade that changes the translation shows as a catalogue diff.
- Units are base units in the name (`_seconds`, `_bytes`), never in a label. Counters end in
  `_total`. Timestamps are `_timestamp_seconds` gauges (Unix seconds), never durations "since",
  so that `time() - metric` is computed by the rules engine and the gauge does not need
  re-exporting every second. State is one gauge per state value with a `state` label and value
  0 or 1 (one-hot), never an integer-coded enum, because an enum cannot be summed or alerted on
  by name. Metadata is an `_info` gauge with value 1.
- Label names come from a closed attribute vocabulary shared with the log schema (below):
  `format`, `repository`, `repository_kind`, `upstream`, `link`, `kind`, `schedule`, `source`,
  `outcome`, `state`, `component`, `operation`, `backend`, `profile`, `scheme`, `condition`,
  `form`, `decision`, `owner_kind`, `direction`, `alert`, `event`, `stream`, `level`,
  `mechanism`, `label`, `listener`, `route` (as semconv `http.route`). A metric introducing a
  label outside this list is a spec change to this table, not a code change (`source`, the
  advisory feed's source name, was added on the Fable recheck of 2026-10-01 when
  `supply-chain-policy.md`'s freshness became per source).

Log attribute keys use the same vocabulary, snake_case, with the semconv keys (`http.request.method`
and friends) rendered as `slog` groups (`http.request.method` is the `method` attribute inside the
`request` group inside the `http` group), so that `JSONHandler` emits nested objects and a
`TextHandler` emits the dotted semconv key.

### Cardinality

The rule, stated so a test can hold it: **no label may take a value that is chosen by a client or
by content.** Package names, versions, digests, tags, blob sizes as labels, principals, client
addresses, user agents, URLs and paths are all forbidden as label values. What remains falls into
two classes:

- **Enumerated labels**, whose values are a closed set fixed in code: `outcome`, `state`,
  `component`, `operation`, `backend`, `profile`, `scheme`, `condition`, `form`, `decision`,
  `owner_kind`, `direction`, `repository_kind`, `alert`, `event`, and `kind` (the registered job
  kinds) and `format` (the registered handlers, at most 33). These are Go types with a fixed
  value set, and the typed instrument methods take them as parameters, so an arbitrary string
  cannot reach a label at all.
- **Configuration-bounded labels**, whose values are operator-created names or operator
  configuration: `repository`, `upstream`, `link`, `schedule`, `source`, `server_address` (the
  semconv host label on the upstream client histogram, whose values are the hosts the adapter's
  sockets open to: the `Upstream` row's host, an allowlisted off-origin host, a realm host, or
  a credential kind's own fixed endpoint, the cloud metadata server or the ECR endpoint, each
  operator configuration or a fixed provider endpoint and never a client's or content's choice,
  `upstream-adapters.md` "Timeouts, concurrency and completion") and `route`. Their
  cardinality is the number of rows an operator created, which is bounded in practice but not
  in principle, so each passes through a `Bounded` limiter at emission: a per-label cap
  (`telemetry.metrics.repository_label_limit`, default 1000, and
  `telemetry.metrics.name_label_limit`, default 200, for `upstream`, `link`, `schedule`,
  `source` and `server_address`) past which every further distinct value is emitted as
  `_other`, and a counter `stackweaver_registry_telemetry_label_overflow_total{label}` counts
  the collapses so the operator sees the cap bite instead of losing series silently. A cap of
  `0` collapses every value to `_other`, which is the operator's opt-out from per-name series
  without a second key (Design, "The telemetry listener", on why an operator might want it).
  The limiter is per process and resets on restart. `route` needs no cap because its values
  are route patterns, bounded by the registered routes (below), but it goes through the same
  code path so the rule has one implementation.
- **`schedule` carries a kind, never a repository or pointer name.** `async-operations.md`
  keeps schedules per pointer and per repository (`signing.resign`, `retention.pass`) as well
  as per source and per link (`policy.feed_sync`, `replication.sync`) and instance-wide (its
  "The scheduler"). A pointer name is content, a repository name is the disclosure the
  `repository` cap exists to bound, and a `schedule` value made from a schedule row's identity
  would carry both outside that cap. The value is therefore the kind for an instance-wide
  schedule (`storage.sweep`), the kind and the configuration-bounded name for a per-source or
  per-link schedule (`policy.feed_sync:{source}`, so `policy.feed_sync:osv` for the default
  feed, whose reserved name is `osv` and which no `policy.feed.sources` entry may take,
  `supply-chain-policy.md` "The advisory feed"; `replication.sync:{link}`), and the kind
  alone for a repository- or pointer-scoped schedule, whose series the leader exports as the
  **most overdue enabled row** of that kind: the `last_run` and `period` of the enabled row
  with the largest `(now - last_run) / period` at collection, so `ScheduleOverdue`'s rule over
  the kind's series is true exactly when some row of that kind is overdue, within one
  `state_interval`. A row's `period` is its `interval` or, for a kind that derives its next run
  from stored state (the cadence re-sign), the gap `next_run_at - last_run_at` the runner wrote
  at `Finish`, so the ratio is defined for every row; a disabled row (deleted, suspended by
  `read_only` or by the offline flag) is not exported and takes no part in the fold, so the
  alert names a schedule that should have run and never one the operator or the instance
  switched off (`async-operations.md` "The scheduler", AC20).
  Which repository or pointer it is comes from the jobs administration routes
  (`async-operations.md` AC21), as per-principal accounting comes from the API and not from a
  series (Scope). The resolved `schedule`-value decision (was Q9) records the alternative.
- **A configuration-bounded value is never taken from the request.** `repository` on a
  request-driven series (`requests_total`, the request log's correlation attribute) is the name
  of the repository row the authorizer resolved, never the path segment as the client sent it;
  a request that resolves no repository is counted under `repository="_none"` and a request
  that reaches no handler mount under `format="_none"`. Otherwise a client enumerating
  guessed names would fill the cap with garbage and collapse the real repositories into
  `_other`, which is the label-cardinality attack the rule above exists to close, arriving
  through the one label that looks operator-controlled (AC5).
- **`_other` on a state-derived per-repository gauge** is an aggregate, not a first-come
  residue: the leader's collector orders repositories by identity, exports the first
  `repository_label_limit` by name and folds the rest into `_other` with the aggregation the
  catalogue row names (a sum for bytes and counts, the minimum for an expiry timestamp, the
  maximum for a staleness age), so the residue still means something to a rule.

The `repository` label is admitted only on metrics whose meaning is per repository (cache bytes
and quota, metadata bytes, pinned snapshots, merge staleness, requested cells, document expiry,
repository request counts) and the catalogue marks each. Harbor labels its quota gauges by `project_name` and this
spec follows that shape, with the cap Harbor lacks. The value is the repository's name, which is
private information on a private registry; "The telemetry listener" below says why that is
acceptable on that listener and nowhere else.

**`http.route`.** Handlers receive the raw `*http.Request` and route inside their own package,
so the server's mux knows only the mount. The semconv rule is that `http.route` is a
low-cardinality pattern or is absent. `net/http`'s `ServeMux` (Go 1.22 and later) sets
`Request.Pattern` on the request it dispatches, and the middleware reads it after the handler
returns, so a handler that routes with a `ServeMux` gets its pattern as `http.route` for free;
otelhttp documents the same two-phase read. A handler that routes by hand gets the mount as its
route, which is truthful but useless; AC5 therefore asserts that, for every registered handler,
the routes observed during its conformance suite are never the bare mount, which makes routing
through `ServeMux` patterns (or an explicit `telemetry.SetRoute(r, pattern)` for a hand-written
router) a conformance-visible obligation rather than a style preference. Placeholders in a
pattern are the pattern's own (`/npm/{repository}/{package}`), which is what the semconv asks.

### The metric catalogue

The catalogue is a Go table, `internal/telemetry/catalogue.go`, one entry per instrument
(OTel name, Prometheus name, type, unit, labels with their class and cap, description, owning
spec). Instruments are constructed from the table, so an instrument that is not in the table
cannot exist, and AC4 asserts the reverse: the set of series names and label keys on `/metrics`
after a fixture exercise equals the table. A user-facing reference,
`docs/operations/observability.md`, is generated from the table by `make docs` and checked in,
in the pattern `management-api.md` uses for its OpenAPI document: a test regenerates it and fails
on any difference.

The initial table, grouped by subsystem. Prometheus names are given; the OTel name is the
Prometheus name with dots for underscores and without the unit and `_total` suffixes. Labels in
italics are configuration-bounded (capped); all others are enumerated.

**HTTP (semconv, unprefixed)**

| Metric | Type | Labels | Notes |
|---|---|---|---|
| `http_server_request_duration_seconds` | histogram | `http_request_method`, `url_scheme`, `http_response_status_code`, `http_route`, `error_type`, `format`, `listener` | `format` is the handler that served it or `api`, `ui`, `replication`, `telemetry`, or `_none` for a request reaching no mount; `listener` is `main` or `telemetry` (the replication routes are a mount on `main`). A hijacked refusal is observed from the status the writer reported (AC30). Extended boundaries (below) |
| `http_server_active_requests` | up-down counter | `http_request_method`, `url_scheme`, `format` | |
| `http_server_request_body_size_bytes`, `http_server_response_body_size_bytes` | histogram | as duration | Byte boundaries (below) |
| `http_client_request_duration_seconds` | histogram | `http_request_method`, *`server_address`*, `server_port`, `http_response_status_code`, `error_type`, *`upstream`* | Emitted by the upstream adapter's decorated transport, the credential kinds' own clients included; `server_address` is the host the socket opened to: the upstream host, an allowlisted off-origin host, a realm host, or a credential kind's fixed endpoint (the metadata server, the ECR endpoint), operator configuration or a fixed provider endpoint and so configuration-bounded under `name_label_limit` beside `upstream` (a cap of `0` collapses both, since each names where the registry fetches from or exchanges credentials) |
| `db_client_operation_duration_seconds` | histogram | `db_system_name`, `db_operation_name`, `db_collection_name`, `db_response_status_code`, `error_type` | From the pgx `QueryTracer`; `db_collection_name` is the table, bounded by the schema; query text is never an attribute |
| `db_client_connection_count`, `db_client_connection_pending_requests`, `db_client_connection_timeouts_total`, `db_client_connection_wait_time_seconds`, `db_client_connection_use_time_seconds` | per semconv | `db_client_connection_pool_name`, `db_client_connection_state` | From the pgx pool statistics |

**Registry-specific (`stackweaver_registry_` prefix)**

| Metric | Type | Labels | Owning requirement |
|---|---|---|---|
| `build_info` | gauge (1) | `version`, `commit`, `go_version` | Prometheus `_info` convention |
| `component_up` | gauge (0/1) | `component` (`db`, `blob_store`, `schema`, `async`, `signing_backend`) | Mirrors readiness (Harbor `harbor_up`) |
| `alerts_total` | counter | `alert` | Design, "Alerts" |
| `telemetry_label_overflow_total` | counter | `label` | Cardinality cap |
| `telemetry_log_records_total` | counter | `stream` (`operational`, `request`, `audit`), `level` | Lets a silent audit sink be alerted on |
| `telemetry_redactions_total` | counter | `mechanism` (`typed`, `key`, `scrub`, `url`) | A non-zero `scrub` count in production is a finding: something reached the log as a plain string |
| `telemetry_disclosures_total` | counter | | The one sanctioned disclosure (`auth.md` AC15); reads 1 after a first start and never more (AC10) |
| `telemetry_audit_sink_failures_total` | counter | | A failed write on the audit sink; feeds `AuditSinkFailing` (AC13) |
| `repositories` | gauge | `format`, `repository_kind` (`local`, `remote`, `virtual`), `state` (`active`, `read_only`, `deleted`) | `repository-lifecycle.md`; state-derived, leader-exported |
| `requests_total` | counter | `format`, *`repository`*, `operation` (`pull`, `push`, `delete`, `list`, `other`), `outcome` (`ok`, `refused`, `denied`, `not_found`, `error`) | The per-repository request count (Harbor `harbor_artifact_pulled` in bounded form); `operation` is the `Scope(r)` action |
| `content_delivery_duration_seconds` | histogram | `format`, `outcome` | Time to first byte to last byte for a blob or document served, separate from API latency (Pulp's split) |
| `storage_blob_operation_duration_seconds` | histogram | `operation` (`get`, `put`, `head`, `delete`, `list`), `backend`, `outcome` | Blob store decorator |
| `storage_blob_bytes_total` | counter | `direction` (`in`, `out`) | |
| `storage_blob_digest_mismatches_total` | counter | `format` | Read-path verification, one increment per aborted read (`storage-and-gc.md` AC21, AC28); feeds `BlobDigestMismatch` |
| `storage_upload_sessions_active` | gauge | `format` | |
| `storage_upload_sessions_expired_total`, `storage_upload_orphans_removed_total` | counter | `format` | `storage-and-gc.md` orphan cleanup |
| `gc_sweep_state` | gauge (one-hot) | `state` (`idle`, `mark`, `intent`, `delete`, `prune`, `orphan_scan`) | GC progress (`storage-and-gc.md` AC28 fixes these names) |
| `gc_sweep_duration_seconds` | histogram | `state` | Per phase |
| `gc_last_sweep_completed_timestamp_seconds` | gauge | | Feeds `GCSweepStale` |
| `gc_blobs_deleted_total`, `gc_bytes_reclaimed_total`, `gc_snapshots_pruned_total`, `gc_deletion_intents_recorded_total`, `gc_intents_cancelled_by_reference_total` | counter | | The last one is `storage-and-gc.md` AC9's race observed in production |
| `gc_deletion_intents_pending` | gauge | | |
| `gc_pinned_out_of_window_snapshots` | gauge | *`repository`* | `storage-and-gc.md` AC19: pointers pinning aged-out snapshots, per repository; the API lists which |
| `gc_pinned_out_of_window_bytes` | gauge | | Registry-wide retained bytes attributable to out-of-window pins; not per repository because attribution of shared blobs is not additive |
| `cache_requests_total` | counter | `format`, `outcome` (`hit`, `miss`, `revalidated`, `stale_served`, `refused`, `upstream_error`) | Hit ratio |
| `cache_referenced_bytes`, `cache_quota_bytes` | gauge | *`repository`* | `proxy-cache.md` AC14: quota utilisation is the ratio; cached files only, `_other` sums |
| `cache_metadata_bytes` | gauge | *`repository`* | `proxy-cache.md` AC29 (its resolved metadata-eviction decision, was Q21): the inline bodies, CAS-backed bodies and declared blobs of a remote's current and retained metadata, outside the quota, so a remote whose metadata dwarfs its files is found from metrics; a blob held by a cached reference and by a declared list at once (`rpm.md` was-Q11) counts here and not in `cache_referenced_bytes` while declared, and moves between the two gauges at the adoption that drops it. Deleting the remote is the only lever, so `CacheMetadataLarge` rides it; state-derived, leader-exported, `_other` sums |
| `cache_evictions_total` | counter | *`repository`* | |
| `cache_refetch_after_eviction_total` | counter | *`repository`* | Thrash: a refetch of something evicted earlier; the ratio of this to evictions is the thrash signal `proxy-cache.md` asks for |
| `cache_coalesced_requests_total` | counter | `format` | Requests joined to an in-flight fetch (`proxy-cache.md` AC11) |
| `cache_fetch_failures_total` | counter | `format`, `condition` (`digest_mismatch`, `truncated`, `stalled`, `size_mismatch`) | `proxy-cache.md` AC10 "recorded observably" |
| `cache_condemnations_total` | counter | `format`, `condition` (`security_signal`, `advisory`) | One per condemnation (`proxy-cache.md` AC13) |
| `cache_divergences_total` | counter | `format` | Author unpublish or yank without a signal |
| `upstream_requests_total` | counter | *`upstream`*, `outcome` (`ok`, `not_found`, `rate_limited`, `error`, `timeout`, `truncated`, `stalled`, `refused_redirect`) | `upstream-adapters.md` |
| `upstream_inflight_requests` | gauge | *`upstream`* | Against the concurrency bound |
| `upstream_rate_limit_remaining` | gauge | *`upstream`* | From the provider's rate-limit headers; absent when the provider sends none |
| `upstream_cooldown` | gauge (0/1) | *`upstream`* | Cool-down state |
| `upstream_cooldown_until_timestamp_seconds` | gauge | *`upstream`* | |
| `upstream_token_exchange_failures_total` | counter | *`upstream`*, `form` (credential kind) | |
| `auth_attempts_total` | counter | `form` (`bearer`, `basic`, `token_scheme`, `path`, `header`, `signed`, `anonymous`), `outcome` (`ok`, `invalid`, `expired`, `revoked`, `plaintext_refused`, `malformed`) | Never the principal |
| `auth_decisions_total` | counter | `format`, `decision` (`allow`, `deny`) | |
| `credentials` | gauge | `state` (`active`, `expiring`, `expired`, `revoked`), `owner_kind` (`user`, `robot`, `admin`) | `credential-management.md` AC5 (computed from the listing's derivation in `internal/credential/metrics_test.go`); state-derived, leader-exported |
| `async_jobs` | gauge | `kind`, `state` (`pending`, `running`) | Queue depth |
| `async_oldest_pending_age_seconds` | gauge | `kind` | |
| `async_job_duration_seconds` | histogram | `kind`, `outcome` (`completed`, `failed`, `cancelled`) | |
| `async_jobs_total` | counter | `kind`, `outcome` | Permanent failures are `outcome=failed` |
| `async_retries_total`, `async_lease_expiries_total` | counter | `kind` | |
| `async_scheduler_leader` | gauge (0/1) | | Exactly one process reports 1 |
| `async_schedule_last_run_timestamp_seconds`, `async_schedule_period_seconds` | gauge | *`schedule`* | Overdue is `time() - last_run > 2 * period` in the rule; `schedule` is the kind, or the kind with a `source` or `link` name (`policy.feed_sync:osv` for the default feed), never a repository or pointer name, a repository- or pointer-scoped kind exported as its most overdue enabled row, a derived-next-run kind's period being `next_run_at - last_run_at` and a disabled row absent (Design, "Cardinality"); state-derived, leader-exported |
| `async_worker_slots` | gauge | `state` (`busy`, `idle`) | |
| `signing_operations_total` | counter | `profile`, `backend`, `outcome` | |
| `signing_duration_seconds` | histogram | `backend` | Signing latency |
| `signing_earliest_document_expiry_timestamp_seconds` | gauge | *`repository`* | The earliest expiry among the repository's signed documents; the `external` alert is `< time() + lead` |
| `signing_keys` | gauge | `state` (`announced`, `active`, `retired`), `backend` | |
| `index_lock_wait_seconds` | histogram | | `signing-service.md` lock wait |
| `index_lock_timeouts_total`, `index_write_retries_total` | counter | | |
| `index_virtual_merge_staleness_seconds` | gauge | *`repository`* | Age of the oldest member write not yet visible |
| `index_requested_cells` | gauge | *`repository`* | The size of a virtual's read-driven requested-cell set against `index.requested_cells_max`, so a virtual at its cap, where a further cell is answered from the merged set and recorded nowhere, is visible (`signing-service.md`'s resolved requested-cell decision, was Q22, and AC35); state-derived from the input record, leader-exported, `_other` takes the maximum |
| `index_virtual_merge_staleness_breaches_total`, `index_virtual_merges_total` | counter | `outcome` on the second | |
| `policy_refusals_total` | counter | `format`, `condition` (`advisory`, `licence`, `security_signal`, `stale_feed`, `unscanned`, `verdict`) | `supply-chain-policy.md` AC5's records are the queryable side; this is the rate |
| `policy_scans_total` | counter | `outcome` (`clean`, `violation`, `failed`) | |
| `policy_unscanned_past_bound` | gauge | | Artifacts unscanned past the window (`supply-chain-policy.md` AC6) |
| `policy_advisory_feed_freshness_timestamp_seconds` | gauge | *`source`* | The source's freshness as `supply-chain-policy.md` measures it (its resolved freshness-measure decision, was Q13): the completion of its last successful sync, or the export time its import declared; one series per configured source, the default feed under its reserved name `osv` and each `policy.feed.sources` entry under its `name` (which is never `osv`), never the newest record's date; state-derived, leader-exported |
| `policy_advisory_feed_degraded` | gauge (0/1) | *`source`* | 1 while that source's freshness is older than `policy.feed.staleness_threshold` (its AC9), `source` valued as the row above (`osv` for the default feed); feeds `AdvisoryFeedDegraded` per source, so the operator sees which one |
| `verify_verdicts_total` | counter | `scheme`, `state` (`verified`, `failed`, `absent`) | `artifact-verification.md` |
| `verify_duration_seconds` | histogram | `scheme` | |
| `verify_reevaluation_pending` | gauge | | |
| `replication_link_state` | gauge (one-hot) | *`link`*, `state` (`syncing`, `idle`, `failed`, `reseeding`, `diverged`, `ended`) | `replication.md` AC10 |
| `replication_last_sync_timestamp_seconds` | gauge | *`link`* | Lag is `time() - this` |
| `replication_snapshots_behind` | gauge | *`link`* | Position gap to the leader as of the last contact |
| `replication_bytes_transferred_total` | counter | *`link`*, `direction` | |
| `manage_operations_total` | counter | `kind`, `outcome` (`completed`, `failed`, `refused`) | |
| `manage_operations_pending` | gauge | `kind` | |
| `audit_events_total` | counter | `event`, `outcome` | Bounded by the event vocabulary |

The catalogue grows by one rule: a sibling spec that needs a metric names it in its own Design
in this spec's convention, and the fold adds the row here and the entry in the Go table in the
same commit. A metric that appears in code without a row fails AC4.

**Histogram boundaries.** Three boundary sets, declared as SDK views by instrument name:
durations of API requests and database operations use the semconv defaults; durations that can
include a body transfer (`http_server_request_duration_seconds`, `content_delivery_duration_seconds`,
`storage_blob_operation_duration_seconds`, `http_client_request_duration_seconds`,
`async_job_duration_seconds`) extend them with `30, 60, 120, 300, 600, 1800`; byte sizes use
powers of four from 1 KiB to 16 GiB. The sets are in the table beside each instrument so the
generated reference states them.

### Structured logging

Three `slog` streams, one `slog.Handler` chain each, all JSON by default
(`telemetry.log.format` admits `text` for a terminal), all to standard output except where the
audit sink is configured otherwise:

- **The operational log** is `Telemetry.Logger()` and the `*slog.Logger` in `Deps`. Its handler
  chain is: the **context handler** (adds `request_id`, `trace_id`, `span_id`, `principal`,
  `repository`, `format` from the request context when present, and `job_id`, `kind` and the
  enqueuing `request_id` under a job, so a handler logging with `InfoContext(ctx, ...)` gets
  correlation for free and never passes them by hand); the **redaction handler** (below); the
  sink (`JSONHandler` or `TextHandler` at `telemetry.log.level`, default `info`). The job
  attributes come from `telemetry.WithJob(ctx, id, kind, requestID)`, which
  `async-operations.md`'s runner calls exactly once per claim, before `Work` (its "Claim" and
  AC27, applied on its Fable follow-up of 2026-10-01, with `internal/async/trace_link_test.go`
  holding the one-call rule); a job's records therefore say which kind produced them, and a record under
  `kind=proxy.revalidate` with no `principal` is how a replayed dispatch is recognised in the
  log (Design, "Tracing", on why nothing here reads the replay marker). Level guidance is the
  `go` skill's: `Debug` for internal state, `Info` for lifecycle, `Warn` for recoverable
  problems, `Error` for what needs attention; the alert mechanism reserves `Error` records with
  an `alert` attribute. Every record on every stream carries `stream` (`operational`,
  `request`, `audit`), so a collector reading one descriptor can route by field even when two
  streams share it (below, "The audit log", on why the default sink shares standard output).
- **The request log** is one `Info` record per request, emitted by the middleware when the
  response completes, on its own logger so an operator can silence it (`telemetry.log.request`,
  default `true`) without silencing lifecycle records. Its fixed schema, semconv keys as groups:
  `http.request.method`, `http.route`, `url.path` **after redaction** (below), `url.scheme`,
  `http.response.status_code`, `http.request.body.size`, `http.response.body.size`,
  `duration_ms`, `client.address` (the connecting peer, or the last trusted proxy's
  `X-Forwarded-For` hop when `telemetry.log.trusted_proxies` names it), `user_agent.original`
  truncated to 256 bytes, `request_id`, `trace_id`, `principal` (the principal's id or name and
  `anonymous`, never a credential), `format`, `repository` (the resolved row's name, Design,
  "Cardinality"), `operation`, `outcome`. The query string is never logged: too many
  ecosystems carry credentials in it (`vagrant.md`'s access token parameter, presigned
  `X-Amz-*`), and no case in any format spec needs it. A response written on a hijacked
  connection gets its line from the status and size the writer reported (AC30), so a policy
  refusal is never the request that left no trace. A replayed dispatch
  (`format-handler-interface.md` AC18) passes no listener middleware and gets no line: it is not
  a request, and its record is the job's (AC31).
- **The audit log** (next section).

**Redaction** is layered, because each layer catches what the others cannot, and `auth.md` AC7
is the end-to-end proof for all of them:

1. **Typed secrets.** `telemetry.Secret` is a string type implementing `slog.LogValuer` whose
   `LogValue` returns `[redacted]` and whose `String` and `%v` renderings do the same, so a
   secret that reaches a log, an error message or a problem body through the type is redacted
   without anyone remembering to; the value itself is read only through `Secret.Expose()`, the
   one accessor, so every site that handles the plaintext is one grep away. The auth verifier,
   the credential store, the upstream credential kinds and the signing backends hold material
   in this type or in their own `LogValuer` types (the `go` skill's password example).
2. **Key denylist.** The redaction handler's `ReplaceAttr` replaces the value of any attribute
   whose key, at any group depth, matches the denylist (`authorization`, `proxy_authorization`,
   `password`, `passwd`, `secret`, `token`, `access_token`, `id_token`, `refresh_token`,
   `api_key`, `apikey`, `private_key`, `pin`, `cookie`, `set_cookie`, and every vendor header
   name `auth.md` AC31 lists, lower-cased and snake-cased), whatever its type.
3. **Per-request scrubbing.** `telemetry.MarkSecret(ctx, value)` registers a value in the
   secret set the middleware installs on the request context (a context value is immutable, so
   the set is a pointer the middleware places and `MarkSecret` appends to; the job runner
   installs one per job through `WithJob`, since the upstream adapter marks credentials under
   `proxy.revalidate` and `replication.sync` too, and a context carrying no set is treated as
   holding none); the redaction handler replaces every occurrence of every marked value in
   every string attribute and in the message of every record emitted under that context,
   including the request log line and the audit line. The auth verifier marks every credential
   it extracts (Bearer and Basic values, path-segment tokens, vendor header values, capability
   tokens, Chef's signature headers) before it does anything else with it, and the upstream
   adapter marks the credential it attaches to an outbound request. This is the backstop for the
   path-token forms (`conda`, `luarocks`, Terraform's capability), where the secret is inside
   `url.path` and no key or type can see it, and it is why `url.path` in the request log is
   safe: the marked segment is scrubbed before the line is rendered. It costs a scan of each
   record's strings against a per-request list that is almost always one entry long; AC26 holds
   the budget.
4. **URL redaction.** `telemetry.RedactURL` strips userinfo and replaces the values of the
   query parameters `upstream-adapters.md`'s redactor names (`access_token`, `token`,
   `X-Amz-Signature`, `X-Amz-Credential`, `X-Goog-Signature`) and any `*url.URL` or `url.URL`
   attribute passes through it in the handler. `internal/upstream`'s own redactor, which knows
   path-token templates, runs first inside that package (its AC20) and this handler is the
   second pass, so the two lists are kept equal by a test that imports both.

`telemetry_redactions_total{mechanism}` counts each layer's interventions. A rising `scrub`
count in production means a plain string carried a secret to the log, which the typed and key
layers should have prevented, and is a defect to chase rather than a success.

**The one sanctioned disclosure.** `auth.md` AC15 has the first-start local admin credential
appear in the log exactly once. `telemetry.Disclose(value)` wraps a value so that the redaction
handler passes it through, records `telemetry_disclosures_total` and emits it only when the
handler's `allow_disclosure` flag, set by the first-start path alone, is on for that one record.
AC10 asserts exactly one call site exists (a test walks the module's AST for `telemetry.Disclose`
and finds it only in the first-start path) and that the emitted record count is one across a
first and a second start.

### The audit log

Security-relevant events go to a channel that is not the operational log, because the two have
different readers, retention and failure modes: an operator tunes the operational log's level
and volume, and a SIEM needs the audit stream complete, unfilterable and schema-stable
(`management-api.md`'s "what ships to a SIEM"; Artifactory keeps a separate access log for the
same reason). The resolved audit-channel question records the choice.

- **Sink.** `telemetry.audit.sink` is `stdout` (default), `stderr` or `file` with
  `telemetry.audit.file`; a file sink is opened append-only and reopened on `SIGHUP` so an
  external rotator can work. Level is not configurable: every audit record is emitted. With the
  default sink the audit stream shares standard output with the operational and request logs,
  so what separates it there is the `stream: audit` attribute on every record, its closed
  schema and its independence from `telemetry.log.level`, not a descriptor of its own; an
  operator who wants the descriptor sets `stderr` (a container runtime tags the two streams
  apart) or `file`. This is stated plainly because the resolved audit-channel question rejected
  the "one stream with a field" option, and the default sink is that shape at the descriptor
  level while keeping every other property the option lacked. A write failure on the audit sink
  is an `Error` on the operational log and an `AuditSinkFailing` alert, and the request that
  produced the event still completes, because a registry that refuses service when its audit
  file is full trades one incident for two; the choice is recorded in the resolved audit-channel
  question with the alternative.
- **Schema.** Every record has `time`, `msg` equal to the event name, and the fixed attribute
  set `management-api.md` names: `event`, `request_id`, `trace_id`, `operation_id` (when an
  `Operation` exists), `principal` and `principal_kind` (`user`, `robot`, `admin`, `anonymous`),
  `client_address`, `repository` (name) and `repository_id` (the `rep_` identity, so a rename
  or deletion leaves lines resolvable; `repository-lifecycle.md` AC27), `format`, `kind`,
  `objects` (an array of coordinates or digests, bounded to 100 entries with a `truncated`
  flag), `outcome` (`completed`, `failed`, `refused`), `problem_type` on a refusal, `snapshot`
  on a completion. Event-specific attributes are admitted only from the event's registered
  extension set, at top level, which is how `credential-management.md` AC18's `credential` (the
  lookup prefix) and `owner` fit without a free-form bag.
- **Emission.** `Auditor.Emit(ctx, event, attrs...)` is the only way to write to the channel.
  It reads the correlation fields from the context (the same context handler as the
  operational log), runs the redaction chain, checks the event against the vocabulary and the
  attributes against the event's extension set, and drops an unregistered event or attribute
  with an operational `Error`; under test, `telemetry.NewTestRecorder(t)` holds the
  `testing.TB` and fails the test on any such drop, so a mis-registered emission cannot pass a
  suite (an earlier draft said "panics under the race-enabled build", which is not a mechanism
  Go offers and would have left production and test behaviour undefined). Which requests emit
  a line is the owning surface's rule, not this channel's: `management-api.md` AC23 (every
  write past the shared authorizer under a registered event, reads never, nothing from that
  surface for an authorizer refusal) and `credential-management.md` AC18 (the same, with its
  reads as the one recorded exception) are enforced where those specs put them
  (`internal/manage/audit_test.go`, `internal/credential/audit_test.go`) using the `Auditor`'s
  test recorder; this spec provides the recorder and the vocabulary.
- **Vocabulary.** Event names are `<subsystem>.<object>.<action>`, a closed Go table
  (`internal/telemetry/audit_events.go`) with each event's extension attributes. The initial
  set, gathered from the siblings:

| Event | Extension attributes | Source |
|---|---|---|
| `auth.credential.refused` (plaintext, malformed or off-route presentation), `auth.credential.invalid` (unknown, expired, revoked, a failed signature, a foreign or expired capability), `auth.access.denied` (a verified principal refused a scope, the admin role or the human-principal requirement) | `form`, `reason` (a closed enumeration, never free text) | `auth.md` "Audit events" and AC37 (its AC27 and AC12 for the causes; the existence oracle): every request the authorizer refuses leaves exactly one of these and the refused surface emits nothing for it; rate-limited, together with `auth.session.refused`, to one record per (`client_address`, minute) with a `suppressed` count so a brute-force attempt is visible but cannot flood the sink |
| `auth.session.issue`, `auth.session.end`, `auth.session.refused` | `method` (`oidc` or `local`; on `issue` and `refused`), `reason` (on `refused`, a closed enumeration) | `auth.md` "Audit events" and AC37, named there on its Fable follow-up of 2026-10-01 (`web-ui.md`'s recheck asked for them): one `issue` per session issued by either flow, one `end` per `POST /ui/auth/logout`, one `refused` per sign-in refused (a callback failing a binding, a form post failing the flow token, a wrong local admin credential, the local account disabled); `refused` shares the refusal events' per-address rate limit, `issue` and `end` are not limited; session expiry at `auth.session.lifetime` emits nothing, since no request causes it; a flow token or password reaches no attribute (AC9) |
| `admin.first_start.credential_issued` | none (the value itself is on the operational log, once) | `auth.md` AC15 |
| `credential.token.create`, `.rotate`, `.revoke`, `.read`, `.list`; `credential.robot.create`, `.update`, `.delete`, `.read`, `.list`; `credential.key.register`, `.delete`, `.read`, `.list`; `credential.trust.set`, `.delete`, `.read`; `credential.exchange` | `credential`, `owner`, `owner_kind`, `multi_repository`, `issuer` (exchange) | `credential-management.md` AC18: every request to its surface that passes the shared authorizer, reads and listings included, emits one line (so every read and listing is an event too, the channel's one read exception), with `problem_type` on a refusal the surface itself makes; a request the authorizer refuses leaves the authorizer's `auth.*` record and none from that package, one record in total |
| `manage.operation` | `kind`, `idempotency_replay` | `management-api.md` AC23, every binding included: one line per write past the authorizer, none for a read |
| `manage.grant.create`, `.delete`; `manage.upstream_credential.create`, `.update`, `.delete`; `manage.upstream.create`, `.update`, `.delete`; `manage.trust.update`, `.import` | `grant`, `credential`, `upstream`, `trust_revision` | `management-api.md`, `artifact-verification.md` |
| `repository.create`, `.configure`, `.freeze`, `.thaw`, `.rename`, `.delete`, `.detach`, `.reclaim` | `changed_fields` (configure: the names of the changed fields, never their values), `previous_name` and `unbound_hosts` (rename: the hostnames the loaded `server.hosts` bound to the old name, empty when none), `reclaim` and `detach` (delete) | `repository-lifecycle.md` AC27, AC28 (its resolved hostname-binding decision, was Q10); `.detach` is a member removed from a `virtual` through its member-list configuration, and `.reclaim` is the pruner's record at tombstone time, the one lifecycle event not tied to an operator's request |
| `signing.key.create`, `.activate`, `.retire`, `.import`, `.submit_external` | `key_id`, `backend`, `profile` | `signing-service.md` AC15 |
| `async.job.cancel`, `async.kind.pause`, `async.kind.resume`, `manage.operation.cancel` | `job_id`, `kind` | `async-operations.md` AC21 |
| `policy.refusal`, `policy.condemnation`, `policy.rule.update` | `condition`, `rule`, `advisory`, `coordinate`, `digests` | `supply-chain-policy.md` AC5; `policy.rule.update` is every accepted change to a repository's `policy` document through `PATCH /api/v1/repositories/{name}` (`management-api.md`'s repository administration), a `coordinate_exemptions` entry added or removed included (its AC25), with `rule` naming the rules changed and `coordinate` the exempted name, never a rule body |
| `policy.feed.import` | `source`, `exported_at`, `records` | `supply-chain-policy.md` AC16 and its resolved freshness-measure decision (was Q13); emitted by `POST /api/v1/system/advisories/import` (`management-api.md` AC34), refused or applied, with no `Operation`; `source` is the source the export belongs to, `osv` for the default feed (its reserved name, also the value when the route's `source` parameter is absent) or a `policy.feed.sources` name; `exported_at` is the declared export time the source's freshness becomes, `records` the count imported (zero on a refusal) |
| `verify.verdict.failed`, `verify.trust.update` | `scheme`, `identity`, `reason` | `artifact-verification.md` AC27 |
| `replication.link.create`, `.update`, `.delete`, `.takeover`, `.sync`, `.reseed`, `replication.export`, `replication.import` | `link`, `leader` | `replication.md` "What a monitor sees" and AC10; `management-api.md`'s endpoint table emits each from its route (`PUT`, `PATCH`, `DELETE .../replication`, `POST .../replication/takeover`, `.../replication/sync`, `.../replication/reseed`, `GET .../export`, `POST .../import`), with no `Operation` (its AC33); `.sync` and `.reseed` were named there on Fable 2026-09-30 and registered here on 2026-10-01, and a re-seed lists the snapshots it discards in the fixed `objects` attribute; the link `GET` is the request log's only |
| `cache.purge` | `condition`, `coordinate`, `digests` | `proxy-cache.md` AC13 (one per condemnation) |

Adding an event is a row here and a table entry in the same commit, with the sibling's Design
naming it first. Ordinary reads and pulls are not audit events: they are the request log's, and
the audit channel is for what changes state or is refused for a security reason.

### Alerts

Every sibling says "raises an operator alert" and none says what that is. Here it is one thing:
**an alert is a named condition in the alert catalogue, and raising it does three things at
once**: increments `stackweaver_registry_alerts_total{alert}`, emits an `Error` record on the
operational log with `alert=<Name>` and the condition's attributes (redacted like any record),
and, for state conditions, the underlying gauge already reflects it. The registry never sends
notifications; the shipped rules file `deploy/observability/alerts.yaml` turns the catalogue
into Prometheus alerting rules that Alertmanager or any compatible engine routes. The resolved
alert-mechanism question records why no notifier is built in.

`telemetry.Alert(ctx, name, attrs...)` is the only emission path, `name` is a value of a closed
Go type, and the "exactly one alert per condemnation" shape `proxy-cache.md` AC13 requires is the
caller's to honour and the caller's test to count; this spec provides the recorder that makes
the count assertable. The counter increments on every call; the `Error` record is emitted at
most once per (`alert`, minute) per process with a `suppressed` count on the next one, in the
shape the `auth.credential.*` audit events use, because an event condition under load (a
thousand `FetchIntegrityFailure`s from one bad mirror) must not turn the operational log into
the incident. State conditions with no emitting call site (`CacheQuotaNearFull`,
`CacheMetadataLarge`, `HighErrorRate`, `ComponentDown`) exist only as rules over their gauges,
and the table says so by their source.

The catalogue, gathered from the siblings; each row is a rule in the shipped file and AC17
asserts the file and the table agree in both directions:

| Alert | Condition | Source |
|---|---|---|
| `JobFailed` | `increase(async_jobs_total{outcome="failed"}[5m]) > 0` | `async-operations.md` AC20 |
| `ScheduleOverdue` | `time() - async_schedule_last_run_timestamp_seconds > 2 * async_schedule_period_seconds` | `async-operations.md` AC20 |
| `SchedulerLeaderless` | `sum(async_scheduler_leader) != 1` for 5m | `async-operations.md` AC20 |
| `VirtualMergeStalenessBreach` | `increase(index_virtual_merge_staleness_breaches_total[5m]) > 0` | `async-operations.md` AC20, `signing-service.md` AC19 |
| `VirtualMergeFailed` | `increase(index_virtual_merges_total{outcome="failed"}[5m]) > 0` | `signing-service.md` AC19 |
| `SigningFailed` | `increase(signing_operations_total{outcome="failed"}[5m]) > 0` | `signing-service.md` AC17 |
| `SigningDocumentExpiring` | `signing_earliest_document_expiry_timestamp_seconds - time() < <lead>` | `signing-service.md` AC22 (`signing.external_expiry_lead`); the rule's lead is templated from configuration at packaging |
| `CachePurgedOnSignal` | `increase(cache_condemnations_total[5m]) > 0` | `proxy-cache.md` AC13, `supply-chain-policy.md` |
| `UpstreamDivergence` | `increase(cache_divergences_total[1h]) > 0` | `proxy-cache.md`, "What ends a cached reference's life" |
| `FetchIntegrityFailure` | `increase(cache_fetch_failures_total{condition="digest_mismatch"}[5m]) > 0` | `proxy-cache.md` AC10 |
| `BlobDigestMismatch` | `increase(storage_blob_digest_mismatches_total[5m]) > 0` | `storage-and-gc.md` AC21, AC28 |
| `VerificationFailed` | `increase(verify_verdicts_total{state="failed"}[5m]) > 0` | `artifact-verification.md` AC27 |
| `ArtifactUnscannedPastBound` | `policy_unscanned_past_bound > 0` | `supply-chain-policy.md` AC6 |
| `AdvisoryFeedDegraded` | `policy_advisory_feed_degraded == 1` for 30m, one alert per `source` | `supply-chain-policy.md` AC9 and its resolved freshness-measure decision (was Q13): the gauge is 1 while that source's freshness, the completion of its last successful sync or the export time its import declared, is older than `policy.feed.staleness_threshold`; never the newest record's date, since a quiet ecosystem is not stale |
| `ReplicationLinkFailed`, `ReplicationReseeding`, `ReplicationDiverged` | `replication_link_state{state="failed"} == 1` (and the other two states) | `replication.md` AC10 |
| `ReplicationLagHigh` | `time() - replication_last_sync_timestamp_seconds > 15m` | `replication.md` AC10 |
| `CacheQuotaNearFull` | `cache_referenced_bytes / cache_quota_bytes > 0.9` for 15m | `proxy-cache.md` AC14 |
| `CacheThrash` | `increase(cache_refetch_after_eviction_total[1h]) / increase(cache_evictions_total[1h]) > 0.5` | `proxy-cache.md` (thrash detectable from metrics) |
| `CacheMetadataLarge` | `cache_metadata_bytes > <bytes>` for 1h (the threshold templated from packaging, default 10 GiB per repository, like the signing lead; rule only, no emitting site) | `proxy-cache.md` AC29 and its resolved metadata-eviction decision (was Q21): metadata is outside the quota and deleting the remote is the only lever, so the gauge is the thing to alert on; a busy npm or PyPI remote crosses 10 GiB only after gigabytes of packuments, which is the moment an operator wants to know about |
| `UpstreamRateLimitLow` | `upstream_rate_limit_remaining < 0.1 * max_over_time(upstream_rate_limit_remaining[24h])` | `upstream-adapters.md` AC31 |
| `UpstreamCooldown` | `upstream_cooldown == 1` | `upstream-adapters.md` AC31 (once per cool-down) |
| `GCSweepStale` | `time() - gc_last_sweep_completed_timestamp_seconds > 2 * gc.sweep_interval` (the lead templated from configuration at packaging, like the signing lead) | `storage-and-gc.md` AC28 |
| `PinnedStorageOutOfWindow` | `gc_pinned_out_of_window_snapshots > 0` for 24h | `storage-and-gc.md` AC19, AC28 |
| `CredentialsExpiring` | `credentials{state="expiring"} > 0` | `credential-management.md` AC5 (informational) |
| `ComponentDown` | `component_up == 0` for 2m | Readiness |
| `HighErrorRate` | 5xx share of `http_server_request_duration_seconds_count` over 5m above 5% (a histogram's `_count`, `_sum` and `_bucket` series are the catalogue entry's own for AC17) | Baseline; hijacked refusals are counted, so a policy incident shows here too (AC30) |
| `AuditSinkFailing` | `increase(telemetry_audit_sink_failures_total[5m]) > 0` | This spec |
| `LabelOverflow` | `increase(telemetry_label_overflow_total[1h]) > 0` | This spec |

### Tracing, request id and propagation

- **Request id.** The middleware reads `X-Request-Id`; a value of 1 to 128 bytes from
  `[A-Za-z0-9._-]` is accepted and echoed, anything else is replaced by a generated id (128
  random bits, base32 lower-case, no padding). Every response on every listener carries
  `X-Request-Id`, which extends `management-api.md`'s rule from the API to format routes,
  replication routes and the telemetry listener, so a client-reported failure on any route can be
  found in the request log. The id is the `request_id` of the request log, the audit line and
  the `Operation` record, so any one leads to the others. Validation exists because the value is
  client-chosen and lands in a log: a newline or a control character in it is log injection.
- **Trace context.** Inbound `traceparent` and `tracestate` are honoured per W3C: a valid header
  makes the request span a child of the caller's, an invalid or missing one starts a new trace
  and drops `tracestate`. The request span is named `{METHOD} {http.route}` per the semconv (the
  route read after the handler returns, as otelhttp does), and carries the semconv HTTP
  attributes with `url.path` after the same scrubbing the request log applies and no
  `url.query` or `url.full` at all (the query-string rule holds for spans as it does for the
  log, since AC9 scans both), `format`, `repository`, `principal` (id or name, never a
  credential) and `request_id`. `trace_id` and `span_id` go on every log record under the
  request so logs and traces meet in either direction.
- **Child spans** exist at every boundary the constitution names as a shared concern: the
  authorizer (`auth.authorize`), the metadata store (`metadata.<method>`, with `db.*` spans
  beneath it from the pgx tracer, `db.operation.name` and `db.collection.name` set and query text
  never recorded), the blob store (`blob.<operation>` with `backend`), fetch-and-cache
  (`proxy.fetch` with `outcome`), the upstream adapter's exchange (`upstream.request` as a client
  span with `server.address`, `http.request.method`, `http.response.status_code` and `url.full`
  after `RedactURL`, which is admitted on the client span alone because a fetch URL is the
  operator's configuration and the adapter's redactor, never a client's input), signing
  (`signing.sign` with `backend`, `profile`), verification
  (`verify.<scheme>`), policy evaluation (`policy.evaluate`). The decorators in `Instrument`
  produce them for everything `Deps` carries, which is the decorator-completeness enforcer's
  scope; the others are produced inside their packages through the tracer handle
  `Telemetry` gives them (the OTel trace API is not SDK and stays importable; the SDK is not).
- **Across the queue.** Enqueueing a job records the current span context in the `Job` row
  (the `trace_context` column holding the W3C `traceparent` string beside `request_id`, both
  set at enqueue; `data-model.md` "Jobs and schedules", its AC41; not an entity and not a mark
  root), and the runner starts the job's span with a **link** to
  it, not as a child, since a job may run hours later and a parent span cannot stay open. A job
  that emits an audit line carries the originating `request_id` from the same row, so the audit
  trail of a deferred `manage.apply` still names the request that asked for it.
- **A replayed dispatch is a job's, not a request's.** The `proxy.revalidate` job reaches a
  handler through the replay entry (`format-handler-interface.md` AC18, `proxy-cache.md` AC26)
  with a discarding writer, below the router and so below every listener middleware. It
  therefore produces no request log line, no `http_server_*` sample and no `requests_total`
  increment; its `Deps` decorators produce child spans of the job's span, the upstream adapter's
  client span and `upstream_*` series move as for any fetch, and every log record under it
  carries the job's `job_id`, `kind=proxy.revalidate` and the enqueuing `request_id`, with no
  `principal`, because the queue gives a job none (`async-operations.md` AC30). That is how an
  operator tells replay activity from client traffic: by the job kind and the absent principal,
  never by the replay marker, whose key lives in the composition root package and which nothing
  under `internal/telemetry` can read or is permitted to import (AC31; `auth.md` AC36). A
  discarded response body never reaches a log record either, which `async-operations.md` AC30
  asserts for `last_error` and this package's recorder confirms for its own outputs.
- **Propagation policy** (the resolved propagation question): outbound requests to **upstreams
  carry no `traceparent` or `tracestate`**, and outbound requests to **replication peers carry
  both**. An upstream is a third party: propagating to it changes the captured traffic the
  conformance corpus replays against, leaks that the fetch was part of a trace, and can carry
  `tracestate` vendor entries the operator never meant to send outside. A replication peer is
  the same operator's registry, where a cross-instance trace is exactly what a failed sync needs.
  The `upstream` adapter's transport is constructed without the propagating round-tripper and
  `upstream-adapters.md` AC4 asserts the header set of an outbound upstream request against the
  adapter's declared set, with `traceparent` and `tracestate` on its forbidden list (its "Request
  hygiene" section, applied 2026-09-28); AC20 here is the same assertion seen from this side and
  shares its test file.
- **Sampling and export.** Head sampling with a parent-based ratio sampler
  (`telemetry.trace.sample_ratio`, default `0.05`); the request-id and log correlation exist
  precisely so an unsampled request is still diagnosable. Export is `none` by default (Pulp's
  choice, for the same reason: a registry with no collector should not buffer spans) or `otlp`
  over gRPC or HTTP to `telemetry.trace.endpoint`, with the standard `OTEL_EXPORTER_OTLP_*`
  environment variables honoured by the SDK for the exporter's own settings (TLS, headers,
  timeouts), because collectors document those and re-spelling them helps nobody.

### Health and readiness

Two probes with Kubernetes semantics and Nexus's separation of health from metrics:

- **`/healthz` (liveness)** answers `200` while the process can serve a request at all; it
  touches no dependency, so a database outage never gets the process killed and restarted into
  the same outage.
- **`/readyz` (readiness)** runs the registered checks with a shared deadline
  (`telemetry.health.timeout`, default `2s`) and answers `200` when all pass, `503` otherwise.
  The checks, each a `component` value of `component_up`: `db` (a pool ping), `schema` (the
  migration version equals the binary's expectation), `blob_store` (a cheap bucket-level
  operation, not a listing), `async` (when `async.workers > 0`, the runner's last heartbeat is
  within two poll intervals), `signing_backend` (when a `kms` or `pkcs11` backend is configured,
  its last health probe succeeded). Results are cached for one second so a probe storm cannot
  become a dependency storm.
- **Two renderings.** On the **main listener** both probes are reserved root-anchored routes
  answering status code only, with an empty body, unauthenticated: a load balancer needs the
  code and nothing more, and a body listing components would make the main listener reveal
  deployment details to anyone. On the **telemetry listener** `/readyz` returns a JSON body
  `{status, checks: [{component, status, duration_ms, error}]}` with `error` passed through the
  redaction chain, for the operator who is already inside the network. Neither rendering ever
  names a repository, a principal or a client, which keeps `auth.md`'s existence oracle intact.
- `healthz` and `readyz` are reserved first path segments on the main listener, added to the
  registration layer's reserved list `format-handler-interface.md` AC11 holds; a handler named
  `healthz` fails registration.

### The telemetry listener

`/metrics`, `/healthz`, `/readyz` (detailed) and `/debug/pprof/*` are served on a second
listener, `telemetry.listen` (default `:9464`, the OTel Prometheus exporter's conventional
port), unauthenticated, that the deployment does not expose publicly; this is Harbor's shape and
the resolved listener question records why it beat Nexus's privilege-gated route on the main
listener. `telemetry.metrics.on_main_listener` (default `false`) additionally mounts `/metrics`
on the main listener under the reserved segment `metrics`, for the single-binary-behind-a-proxy
deployment that cannot open a second port, and when it is on the route requires an admin registry
token, because a client-facing `/metrics` reveals repository names through the `repository`
label. The pprof routes exist because a registry that streams gigabytes needs its allocation and
goroutine profiles reachable without a rebuild, and they are only ever on the telemetry
listener.

**What the listener discloses, and why that is the reason it is never public.** Every
per-repository series (`cache_referenced_bytes`, `cache_metadata_bytes`, `repositories`,
`gc_pinned_out_of_window_snapshots`, `signing_earliest_document_expiry_timestamp_seconds`,
`index_virtual_merge_staleness_seconds`, `index_requested_cells`, `requests_total`) carries
repository names as label values, and on a private registry those names are private: `auth.md`'s
existence oracle (its AC17) exists precisely so a client cannot learn them. A reader of `:9464`
learns all of them at once. The same holds for every other configuration-bounded label, which
is why the rule is stated per class and not per series: the six `upstream_*` series and
`http_client_request_duration_seconds` carry the operator's upstream names and, through
`server_address`, the hosts the registry fetches from and exchanges credentials with (an
internal mirror's hostname is as private as a repository's name, and a credential kind's fixed
endpoint can carry an account identity, as an ECR registry host carries the AWS account id;
`upstream-adapters.md`'s Fable recheck of 2026-10-01 raised the first and its follow-up the
second), `replication_*` carries link names, and the `policy_advisory_feed_*` gauges and
`async_schedule_*` carry source and link names; `schedule` never carries a repository or
pointer name (Design, "Cardinality"), so collapsing `repository` leaves no repository name on
any series. The three answers weighed on the Fable recheck of 2026-10-01 (`auth.md`'s recheck
raised it): hashing the value would keep the series and lose the one thing an operator needs
from it, which repository is thrashing or pinned; an opt-in flag would default the quota and
thrash signals off, defeating `proxy-cache.md` AC14; so the label carries the name, and the
disclosure is the stated reason the telemetry listener is never exposed (`deployment.md`
AC13: bound only to `telemetry.listen`, no Service, no Ingress, and when scraping is wanted a
`PodMonitor` that targets the container port inside the cluster network, never a
`ServiceMonitor`, which would need the Service that criterion forbids), why the main-listener
mount needs an admin token (an admin can list every repository and every upstream already, so
the route discloses nothing new to its only reader) and answers `not-found` to everyone else
(AC23), and why an operator whose scrape path is less trusted than their admin sets
`telemetry.metrics.repository_label_limit: 0`, which collapses every repository value to
`_other` and keeps the aggregate signals, and `telemetry.metrics.name_label_limit: 0`, which
does the same for `upstream`, `server_address`, `link`, `schedule` and `source` (Design,
"Cardinality"). The resolved per-repository-labels question (was Q6) records this as its
accepted cost.

### Multi-replica semantics

Counters and histograms are per process and Prometheus sums them; `build_info` and
`component_up` are per process on purpose. **State-derived gauges** (`repositories`,
`credentials`, `async_jobs`, `async_oldest_pending_age_seconds`, `gc_pinned_out_of_window_*`,
`cache_referenced_bytes`, `cache_quota_bytes`, `signing_keys`,
`signing_earliest_document_expiry_timestamp_seconds`, `index_virtual_merge_staleness_seconds`,
`index_requested_cells`, `policy_unscanned_past_bound`, `verify_reevaluation_pending`,
`replication_*`, `async_schedule_*`) describe shared state in PostgreSQL
(`cache_metadata_bytes` and the per-source `policy_advisory_feed_*` gauges among them), and if
every replica exported them a `sum()` would multiply them by the
replica count. They are therefore computed on an interval (`telemetry.metrics.state_interval`,
default `30s`) by **the process holding the async scheduler leadership** (`async-operations.md`'s
leader) and by no other; a replica that loses leadership stops exporting them within one
interval. A `workers: 0` web replica never leads and never exports them, which is the right
answer since it has no worker to run the collector. The rules file's `sum()` expressions are
therefore correct on any replica count, and AC7 asserts the property with two processes against
one database.

### Configuration

Keys follow the cobra-viper skill as `management-api.md` and `async-operations.md` apply it: a
typed `telemetry.Config` unmarshalled from Viper in the root command factory, every key with a
default, bound to `STACKWEAVER_REGISTRY_TELEMETRY_*`, the package never importing Viper.
`deployment.md` carries them in its key inventory and `scripts/check-config-keys.js` (its AC5)
holds this table and the schema equal; they are named here because they are this subsystem's
policy.

| Key | Default | Meaning |
|---|---|---|
| `telemetry.listen` | `:9464` | The telemetry listener; empty disables it (then `/metrics` is reachable only through `on_main_listener`) |
| `telemetry.metrics.enabled` | `true` | Serve `/metrics` |
| `telemetry.metrics.on_main_listener` | `false` | Also mount `/metrics` on the main listener, admin token required |
| `telemetry.metrics.repository_label_limit` | `1000` | Cap on distinct `repository` label values per process; `0` collapses every value to `_other` |
| `telemetry.metrics.name_label_limit` | `200` | Cap on distinct `upstream`, `link`, `schedule`, `source` and `server_address` values; `0` collapses every value to `_other` |
| `telemetry.metrics.state_interval` | `30s` | State-derived gauge collection interval on the leader |
| `telemetry.log.level` | `info` | Operational log level |
| `telemetry.log.format` | `json` | `json` or `text` |
| `telemetry.log.request` | `true` | Emit the request log |
| `telemetry.log.trusted_proxies` | none | CIDRs whose `X-Forwarded-For` is believed for `client.address` |
| `telemetry.audit.sink` | `stdout` | `stdout`, `stderr` or `file` |
| `telemetry.audit.file` | none | Path for the `file` sink; append-only, reopened on `SIGHUP` |
| `telemetry.trace.exporter` | `none` | `none` or `otlp` |
| `telemetry.trace.endpoint` | none | OTLP endpoint; `OTEL_EXPORTER_OTLP_*` variables refine the exporter |
| `telemetry.trace.sample_ratio` | `0.05` | Parent-based head sampling ratio |
| `telemetry.health.timeout` | `2s` | Shared deadline for readiness checks |
| `telemetry.pprof` | `true` | Serve `/debug/pprof/*` on the telemetry listener |

### Benchmark gates: what this spec owns and what it does not

The constitution makes benchmarks CI gates and the charter's AC6 asserts one for blob throughput,
but no spec owns the mechanism that compares a run against a baseline and fails. This spec does,
because performance visibility is observability and because a gate every sibling reinvents is a
gate that drifts:

- **The mechanism.** `make bench` runs every `Benchmark*` in the module with `-count=6
  -benchmem` and writes the result; `scripts/bench-gate.sh` compares it against the checked-in
  baseline `benchmarks/baseline.txt` with `benchstat`, and fails when any benchmark's mean
  regresses beyond the threshold its owning spec stated in a `// gate: <metric> <threshold>`
  comment beside the benchmark (`benchstat`'s significance test guards against noise; a result
  the test does not find significant is not a regression). Baselines are refreshed by a
  deliberate commit that says so, never by the gate itself, and the baseline records each
  benchmark's run-to-run variance (`benchstat`'s ± figure over the six runs); a `// gate:`
  threshold tighter than that variance is refused by the script with a message naming both
  numbers, because a gate that can trip on noise is the gate an operator disables, and a
  disabled gate is the "correct-and-slow, noticed in two months" outcome the constitution
  names. The CI job runs on pushes to `main` beside the conformance job
  (`.github/workflows/ci.yml`), not on pull requests, per the CI-economy rule, on a runner
  class recorded in the baseline's header so a runner change is visible as such; a regression
  is therefore found on `main` after the merge, the same accepted shape as conformance, and the
  fix is a revert or a fix on `main`, never a gate relaxed to pass.
- **Owned here:** the mechanism, its CI job, and this package's own budgets: the middleware's
  overhead per request (request id, span creation unsampled, metrics, request log with
  redaction) and the redaction handler's cost with one, three and ten marked secrets, both as
  p99 per-call latency and allocations per call (AC26).
- **Owned elsewhere, run here:** `storage-and-gc.md` AC7 (blob throughput), `async-operations.md`
  AC25 (claim latency and throughput), `artifact-verification.md` AC26 (ingest overhead),
  `signing-service.md` AC28 (concurrent publishes under lock wait), `storage-and-gc.md` AC22
  (the verified read path at 90 percent of unverified throughput), and `project-charter.md` AC6,
  which is the storage gate seen from the charter. Each names its budget in its own benchmark
  file; this spec supplies the job that makes the budget binding.

### What the conformance harness can and cannot see

`conformance-harness.md`'s observation rule (its AC10 discussion in
`format-handler-interface.md`) is that a server-log assertion is not protocol-observable and
cannot live in a conformance case. Everything in this spec is therefore verified by integration
and unit tests in `internal/telemetry` and by the siblings' integration tests using the
recorders this package exports (`telemetry.NewTestRecorder` captures metrics, log records, audit
records and alerts in memory for assertion), with two exceptions that are protocol-visible and
get conformance cases in `conformance/core/`: `X-Request-Id` on every response (AC14) and the
absence of a credential in any response body (the format specs' criteria, through `auth.md`
AC7's scan, which runs against a real client's traffic).

## Acceptance Criteria

Each criterion is independently testable, states an observable outcome, and is checked off
during implementation with evidence.

- [ ] AC1: Only `internal/telemetry` imports the OpenTelemetry SDK, the OpenTelemetry metric API,
      the OpenTelemetry exporters and `client_golang`, asserted by an import walk over every
      package under `internal/**` and `cmd/**` and by a `depguard` rule that fails `make verify`
      on a violation.
- [ ] AC2: No package under `internal/format/**` imports `internal/telemetry`, the OpenTelemetry
      API or `client_golang`, and a fixture handler that does fails the same import walk.
- [ ] AC3: Every consumer interface `format.Deps` carries has a decorator in `internal/telemetry`
      that implements it, and every method of every decorator starts a span whose name is
      `<layer>.<method>` and records the outcome, asserted by reflection over `Deps` and a fake
      inner implementation; adding a method to a `Deps` interface without a decorator method
      fails the test, not compilation alone.
- [ ] AC4: The set of metric names and label keys rendered on `/metrics` after a fixture exercise
      of every subsystem equals the catalogue table in `internal/telemetry/catalogue.go`, in both
      directions (no unlisted series, no unexercised entry), and every label key is in the closed
      attribute vocabulary; the semconv family renders unprefixed (`http_request_method`,
      `url_scheme`, `http_response_status_code`, `error_type`, `server_address`,
      `db_collection_name` as label keys; `http_client_request_duration_seconds` among the
      names) and the registry family under `stackweaver_registry_` (`build_info` as an `_info`
      gauge with `version`, `commit`, `go_version`; `content_delivery_duration_seconds`,
      `storage_blob_operation_duration_seconds`, `async_job_duration_seconds`,
      `verify_reevaluation_pending`, `component_up{component}` over `db`, `schema`, `blob_store`,
      `async`, `signing_backend`, and `repositories{format,repository_kind,state}`), the
      catalogue's own counters included (`telemetry_disclosures_total`,
      `telemetry_audit_sink_failures_total`, `telemetry_label_overflow_total{label}`); the
      standard collectors' families (`go_*`, `process_*`, `promhttp_*`) and `target_info` are
      the only series admitted outside the table, no `otel_scope_*` label appears on any series,
      and the exporter is constructed without a namespace option (the prefix is in each
      registry-specific instrument's name); `docs/operations/observability.md` regenerated from
      the table equals the checked-in copy.
- [ ] AC5: For every enumerated label the instrument methods accept only the label's Go type, so
      a string cannot reach the label; for every configuration-bounded label, the
      (`repository_label_limit` + 1)th distinct value renders as `_other` and
      `telemetry_label_overflow_total{label}` increments, with `telemetry.metrics.repository_label_limit`
      and `telemetry.metrics.name_label_limit` as the caps (`server_address` under the second,
      beside `upstream`, `link`, `schedule` and `source`), and a cap of `0` renders every value
      as `_other`; a state-derived per-repository gauge over the cap exports the first
      `repository_label_limit` repositories by identity and folds the rest into `_other` with
      the catalogue row's aggregation (`cache_referenced_bytes` summed,
      `signing_earliest_document_expiry_timestamp_seconds` at its minimum,
      `index_requested_cells` at its maximum); `schedule` renders as the kind for an
      instance-wide schedule, the kind with its `source` or `link` name for a per-source or
      per-link one (`policy.feed_sync:osv` for the default feed), and the kind alone for a
      repository- or pointer-scoped one, whose `async_schedule_*` pair is the most overdue
      enabled row's, a derived-next-run row's period being `next_run_at - last_run_at` and a
      disabled row taking no part in the fold, so no `schedule` value contains a repository or
      pointer name, a fixture with one overdue pointer schedule among many current ones fires
      `ScheduleOverdue` on the kind's series, and the same fixture with that row disabled does
      not; a thousand requests
      naming a thousand non-existent repositories leave `requests_total` with one series under
      `repository="_none"` and the overflow counter unmoved, and a request denied on a private
      repository is counted under that repository's own name; `http.route` is the
      `Request.Pattern` a handler's `ServeMux` set, or the value an explicit `SetRoute` set, and
      after a format's conformance suite runs no `http_route` value observed for that format
      equals its bare mount.
- [ ] AC6: Each of the following is present on `/metrics` with the catalogue's labels and moves
      under a driven scenario in the owning package's integration test using this package's
      recorder: `credentials{state,owner_kind}`; `signing_earliest_document_expiry_timestamp_seconds`,
      `signing_duration_seconds`, `index_lock_wait_seconds`, `index_virtual_merge_staleness_seconds`,
      `index_requested_cells{repository}` (rising with each recorded cell, flat at
      `index.requested_cells_max` for a further request, `signing-service.md` AC35);
      `upstream_requests_total{upstream,outcome}`, `upstream_rate_limit_remaining`,
      `upstream_cooldown`, `upstream_token_exchange_failures_total`; `async_jobs{kind,state}`,
      `async_oldest_pending_age_seconds`, `async_lease_expiries_total`, `async_retries_total`,
      `async_jobs_total{outcome="failed"}`, `async_scheduler_leader`,
      `index_virtual_merge_staleness_breaches_total`; `cache_referenced_bytes`, `cache_quota_bytes`,
      `cache_evictions_total`, `cache_refetch_after_eviction_total`, `cache_metadata_bytes` (a
      remote's metadata counted there and not in `cache_referenced_bytes`, a blob on a cached
      reference and a declared list at once counted there only while declared and moving to
      `cache_referenced_bytes` at the adoption that drops it, `proxy-cache.md` AC29); `gc_sweep_state`,
      `gc_last_sweep_completed_timestamp_seconds`, `gc_bytes_reclaimed_total`,
      `gc_pinned_out_of_window_snapshots`; `policy_refusals_total{condition}`,
      `policy_unscanned_past_bound`, `policy_advisory_feed_freshness_timestamp_seconds{source}`
      and `policy_advisory_feed_degraded{source}` (one series per configured source, `osv` for
      the default feed, the gauge
      moving to 1 on an injected clock past `policy.feed.staleness_threshold` from the last
      completed sync or the declared export time, not from the newest record's date;
      `supply-chain-policy.md` AC9); `replication_link_state{link,state}`,
      `replication_last_sync_timestamp_seconds`, `replication_snapshots_behind`;
      `requests_total{format,repository,operation,outcome}` with `outcome` over `ok`, `refused`,
      `denied`, `not_found`, `error`; `auth_attempts_total{form,outcome}` with `outcome` over
      `ok`, `invalid`, `expired`, `revoked`, `plaintext_refused`, `malformed` and `form` including
      `anonymous`; `signing_operations_total{profile,backend,outcome}` and `signing_keys{state,backend}`;
      `cache_fetch_failures_total{condition}` over `digest_mismatch`, `truncated`, `stalled`,
      `size_mismatch`; `cache_condemnations_total{condition}` over `security_signal`, `advisory`;
      `credentials{state,owner_kind}` with `owner_kind` over `user`, `robot`, `admin`.
- [ ] AC7: With two processes against one database, every state-derived gauge is exported by the
      process holding scheduler leadership and by no other, and within one `state_interval` of a
      leadership change the exporting process changes; `sum()` over both processes equals the
      database's truth for `repositories`, `credentials` and `async_jobs`.
- [ ] AC8: Every `slog` call outside `main` and tests passes a context, uses no global logger and
      uses a snake_case key from the attribute vocabulary, and no `fmt.Print*`, `log.Print*` or
      `println` call exists outside `main` and tests, enforced by `sloglint` and `forbidigo` in
      `make verify`.
- [ ] AC9: A credential presented in every form `auth.md` AC31 names (Bearer, Basic, `Token`
      scheme, path segment, vendor header, URL capability, signed headers) on a real successful
      and a real failed request, and an upstream credential of every `upstream-adapters.md` kind
      on a real failed fetch, appears in no operational log record, no request log line, no audit
      line, no span attribute, no metric label and no response body, asserted by capturing all
      five outputs and scanning for the value and its hash preimage; a `telemetry.Secret`,
      a denylisted key and a `MarkSecret` value each cause exactly one redaction counted under its
      mechanism.
- [ ] AC10: `telemetry.Disclose` has exactly one call site in the module, in the first-start
      admin-credential path, asserted by an AST walk; across a first start and a second start the
      credential appears in the log exactly once and `telemetry_disclosures_total` reads 1.
- [ ] AC11: The request log emits exactly one record per request on every listener with the
      fixed schema (method, route, redacted path, scheme, status, body sizes, duration,
      client address, truncated user agent, request id, trace id, principal, format, repository,
      operation, outcome) with `http.request.method`, `http.route`, `http.response.status_code`
      rendered as nested groups by `JSONHandler` and as dotted keys by `TextHandler` according to
      `telemetry.log.format`, and never a query string; a path-segment token in the path is
      scrubbed in the recorded `url.path`; `client.address` is the peer unless the peer is in
      `telemetry.log.trusted_proxies`, in which case it is the last `X-Forwarded-For` hop;
      every record on the three streams carries `stream` as `operational`, `request` or
      `audit`; and `telemetry.log.request: false` silences the request log without silencing
      lifecycle records.
- [ ] AC12: `Auditor.Emit` writes a record with the fixed attribute set (`event`, `request_id`,
      `trace_id`, `operation_id`, `principal`, `principal_kind`, `client_address`, `repository`,
      `repository_id`, `format`, `kind`, `objects`, `outcome`, `problem_type`, `snapshot`) plus only
      the event's registered extension attributes; the vocabulary table holds every event the
      audit-event table in Design lists, `.create`, `.update`, `.delete`, `.import` and the other
      actions included (`credential.robot.update`, `.read`, `.list`, `credential.key.read`,
      `.list`, `credential.trust.set`, `.delete`, `.read`, `repository.configure`,
      `replication.link.create`, `.update`, `.delete`, `.takeover`, `.sync`, `.reseed`,
      `replication.export`, `replication.import`, `policy.rule.update`, `policy.feed.import`,
      `auth.session.issue`, `auth.session.end` and `auth.session.refused` among them), with the
      extension sets stated there (`credential`, `owner`, `reason`, `method`,
      `coordinate`, `digests`, `changed_fields`, `link`, `leader`, `source`, `exported_at`,
      `records`, and `previous_name` with `unbound_hosts` on `repository.rename`, among them), so
      a `repository.rename` record listing `unbound_hosts`, a `policy.rule.update` record naming
      `rule` and `coordinate`, a `replication.link.reseed` record listing the discarded snapshots
      in `objects`, a `policy.feed.import` record naming `source` and `exported_at`, an
      `auth.session.issue` record naming `method` and an `auth.session.refused` record naming
      `method` and `reason` are accepted, and an `auth.session.end` record carrying `method` is
      not; an unregistered event or attribute is dropped with an operational `Error` and,
      under `telemetry.NewTestRecorder(t)`, fails the test; `objects` truncates at 100 with a
      `truncated` flag; `auth.credential.refused`, `auth.credential.invalid`, `auth.access.denied`
      and `auth.session.refused` are rate-limited per client address per minute with a
      `suppressed` count, and `auth.session.issue` and `auth.session.end` are not.
- [ ] AC13: The audit sink is separate from the operational log: with `telemetry.log.level` at
      `error` every audit record is still written; `telemetry.audit.sink` selects `stdout`
      (default), `stderr` or `file`, and with `file` the path in `telemetry.audit.file` is opened
      append-only and a `SIGHUP` reopens it; a write failure on the sink raises `AuditSinkFailing`,
      increments `telemetry_audit_sink_failures_total` and does not fail the request.
- [ ] AC14: Every response on both listeners, the main listener's format, `api`, `ui` and
      `replication` mounts and the telemetry listener alike, carries
      `X-Request-Id`; a client value of 1 to 128 bytes from `[A-Za-z0-9._-]` is echoed and any
      other value (including one with a control character) is replaced by a generated id; the
      echoed id equals the `request_id` of the request log line, the audit line and the
      `Operation` record for that request.
- [ ] AC15: A handler compiled against `Deps` and logging with `InfoContext` on the `*slog.Logger`
      `Deps` carries produces records carrying `request_id`, `trace_id`, `principal`,
      `repository` and `format` it never set by hand, with `trace_id` and `span_id` present only
      when the request is sampled; a request with a valid inbound `traceparent` produces a
      request span named `{METHOD} {http.route}` that is its child, an invalid one starts a new
      trace and drops `tracestate`, the request span carries `url.path` scrubbed as the request
      log's is and no `url.query` or `url.full` attribute, and each `Deps` call produces a child
      span named per AC3.
- [ ] AC16: Enqueueing a job records the current `traceparent` and `request_id` on the `Job`; the
      job's span carries a link to the enqueuing span (not a parent), and an audit line emitted by
      the job carries the originating `request_id`.
- [ ] AC17: `deploy/observability/alerts.yaml` parses as Prometheus rules, contains exactly one
      rule per alert in the catalogue and no rule for an alert outside it, and every metric name
      in every rule expression is in the metric catalogue (a histogram's `_count`, `_sum` and
      `_bucket` series resolving to their entry, the templated values `<lead>`, the GC sweep
      interval and the `CacheMetadataLarge` threshold each named in the file's header for the
      packaging to fill); `telemetry.Alert` accepts only catalogue names, each call increments
      `alerts_total{alert}`, the first call per (`alert`, minute) emits one `Error` record with
      `alert=<Name>` and the next carries `suppressed` with the count, so a thousand calls in a
      minute leave the counter at a thousand and the log with two records.
- [ ] AC18: Each of the following alert conditions fires exactly once in its driving scenario,
      asserted through the recorder in the owning package's test: `JobFailed`, `ScheduleOverdue`
      (a schedule idle for twice its period, a per-pointer one firing on its kind's series),
      `VirtualMergeStalenessBreach`, `SigningDocumentExpiring`
      (at the configured lead), `CachePurgedOnSignal` (once however many revalidations observe
      the signal), `FetchIntegrityFailure`, `BlobDigestMismatch`, `VerificationFailed`,
      `ArtifactUnscannedPastBound`, `AdvisoryFeedDegraded` (per source, on the freshness measure
      `supply-chain-policy.md` AC9 states: a source whose last sync completed inside the
      threshold with no new record stays clear, one whose sync failed partway past it fires),
      `ReplicationLinkFailed`, `ReplicationReseeding`, `ReplicationDiverged`, `UpstreamCooldown`,
      `PinnedStorageOutOfWindow`; and the rule-only conditions `CacheQuotaNearFull`,
      `CacheMetadataLarge`, `CacheThrash`, `HighErrorRate` and `ComponentDown` evaluate true
      against recorded samples in their driving states and false outside them.
- [ ] AC19: A token minted through `credential-management.md`'s routes appears in the `201`
      response and in no metric, span, log or audit record of the create, rotate, list, read,
      replay or refusal that follows, asserted through this package's recorder in that spec's
      `display_once_test`; the `credentials` gauge reflects a create, an expiry-window entry and a
      revocation within one `state_interval`.
- [ ] AC20: Outbound requests to an upstream carry neither `traceparent` nor `tracestate`
      (asserted at a test upstream), and outbound requests to a replication peer carry both with
      the current span's context, so a follower's request span is a child of the leader's
      trace.
- [ ] AC21: `/healthz` on the main listener answers `200` with an empty body while the database
      and blob store are unreachable; `/readyz` answers `503` with an empty body in that state and
      `200` once they are reachable and the schema version matches; the telemetry listener's
      `/readyz` body names each `component` with its status and a redacted error, and no rendering
      contains a repository name, a principal or a client address; `component_up` mirrors each
      check; results are cached for one second under a probe storm.
- [ ] AC22: `healthz`, `readyz` and `metrics` are reserved first path segments: a fixture handler
      whose `Name()` is one of them fails registration before the server serves any request.
- [ ] AC23: `/metrics` is served on the telemetry listener without authentication and is absent
      from the main listener by default; with `on_main_listener: true` it is served on the main
      listener only to a caller with an admin registry token and answers `not-found` to anyone
      else; `/debug/pprof/*` is never served on the main listener.
- [ ] AC24: `make bench` runs every benchmark in the module and `scripts/bench-gate.sh` fails
      when any benchmark's mean regresses beyond the threshold in its `// gate:` comment against
      `benchmarks/baseline.txt` with `benchstat` significance, passes on an insignificant change,
      fails on a benchmark with no `// gate:` comment, and refuses a `// gate:` threshold tighter
      than the variance the baseline records for that benchmark, naming both; the CI job runs it
      on pushes to `main` and not on pull requests.
- [ ] AC25: `storage-and-gc.md` AC7's and AC22's, `async-operations.md` AC25's,
      `artifact-verification.md` AC26's and `signing-service.md` AC28's benchmarks carry `// gate:`
      comments and are compared by the same job, so that a regression in any of them fails the
      `main` build.
- [ ] AC26: The middleware adds at most 25 µs p99 and at most 12 allocations per request with
      tracing unsampled, metrics on and the request log on, and the redaction handler processes
      a ten-attribute record with three marked secrets in at most 5 µs p99, both as benchmark
      gates under AC24.
- [ ] AC27: Every `telemetry.*` key in the configuration table (`telemetry.listen` at `:9464`,
      `telemetry.metrics.enabled`, `telemetry.metrics.on_main_listener` at `false`,
      `telemetry.metrics.repository_label_limit`, `telemetry.metrics.name_label_limit`,
      `telemetry.metrics.state_interval` at `30s`, `telemetry.log.level`, `telemetry.log.format`
      at `json`, `telemetry.log.request`, `telemetry.log.trusted_proxies`, `telemetry.audit.sink`,
      `telemetry.audit.file`, `telemetry.trace.exporter` at `none`, `telemetry.trace.endpoint`,
      `telemetry.trace.sample_ratio` at `0.05`, `telemetry.health.timeout`, `telemetry.pprof`)
      has the default the table states, binds to its `STACKWEAVER_REGISTRY_TELEMETRY_*` variable,
      is settable by flag, environment variable and file in the cobra-viper precedence order; the
      `OTEL_EXPORTER_OTLP_*` variables reach the OTLP exporter unchanged; and `internal/telemetry`
      imports neither Viper nor Cobra.
- [ ] AC28: `Telemetry.Shutdown(ctx)` flushes the OTLP exporter and stops the state-gauge
      collector and every goroutine the package started within the context's deadline, asserted
      under `goleak` after a full start, exercise and shutdown.
- [ ] AC29: Histogram boundaries are those the catalogue states: `http_server_request_duration_seconds`
      and the other transfer-bearing durations carry the extended set through `1800`, API and
      database durations the semconv default, and byte histograms powers of four from 1 KiB to
      16 GiB, read off `/metrics`.
- [ ] AC30: The middleware's `ResponseWriter` wrapper implements `http.Flusher`,
      `http.Hijacker`, `Unwrap() http.ResponseWriter` and the reporter interface
      `format-handler-interface.md` declares beside `WriteRefusal`, so a fixture handler that
      hijacks through `http.NewResponseController(w).Hijack()` or a direct assertion, writes a
      status line on the raw connection and reports the status and the body's length once
      through `HijackReporter.Hijacked`, leaves the request with
      exactly one request log line carrying that status and size, one
      `http_server_request_duration_seconds` sample and one `requests_total` increment with
      `outcome="refused"` under it, a request span ended with that status, and
      `http_server_active_requests` decremented; a hijack followed by no report leaves a line and
      a sample with status `0` and an operational `Error` naming the route, never a missing
      request; the same flow through `WriteRefusal` on a real HTTP/1.1 socket is the shared
      assertion of `supply-chain-policy.md` AC18 and `format-handler-interface.md` AC14.
- [ ] AC31: A replayed dispatch through the replay entry (`format-handler-interface.md` AC18)
      under a `proxy.revalidate` job produces no request log record, no `http_server_*` sample
      and no `requests_total` increment, while its `Deps` spans are children of the job's span,
      its upstream fetch moves `upstream_requests_total` and `http_client_request_duration_seconds`
      as any fetch does, and every log record emitted under it carries `job_id`,
      `kind="proxy.revalidate"`, the enqueuing `request_id` and no `principal`; no string from the
      discarded response body appears in any record the recorder captured; and `internal/telemetry`
      imports neither the composition root package nor `internal/proxy` and references no
      replay-marker symbol, asserted by the boundary walk.

## Test Plan

Every acceptance criterion maps to at least one test. "Manual" is allowed only with a written
procedure.

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | architecture test + lint | `internal/telemetry/boundary_test.go` (import walk); `.golangci.yml` `depguard` rule, run by `make verify` |
| AC2 | architecture test + lint | `internal/telemetry/boundary_test.go` (fixture handler under `internal/format/testdata`); the same `depguard` rule |
| AC3 | unit (reflection) | `internal/telemetry/decorator_test.go` |
| AC4 | integration | `internal/telemetry/catalogue_test.go` (fixture exercise, `/metrics` scrape, both-direction diff with the standard collectors and `target_info` allowlisted by prefix, no `otel_scope_*` label, the exporter's option set pinned); `internal/telemetry/docgen_test.go` (regenerated reference equals checked-in) |
| AC5 | unit + integration + conformance | `internal/telemetry/labels_test.go` (typed labels, cap and `_other`, a cap of `0`, overflow counter, `server_address` under `name_label_limit`, the state-derived `_other` aggregation per row); `internal/async/metrics_test.go` (the `schedule` value for an instance-wide, a per-source with `osv`, a per-link, a per-repository and a per-pointer schedule, the most-overdue fold with a derived-next-run row's period, a disabled row absent from the fold, and `ScheduleOverdue` on the kind's series; shared with `async-operations.md` AC20); `internal/telemetry/request_log_test.go` (a thousand non-existent names under `_none`, a denied private repository under its own name; shared with `auth.md` AC17's existence-oracle fixture); `conformance/core/route_label_test.go` (post-suite `http_route` values per format) |
| AC6 | integration | `internal/telemetry/catalogue_test.go` (presence and labels); the owning packages' tests using `telemetry.NewTestRecorder`: `internal/credential/metrics_test.go`, `internal/signing/metrics_test.go`, `internal/index/virtual_remote_member_test.go` (`index_requested_cells` rising per cell and flat at the cap, `signing-service.md` AC35), `internal/upstream/metrics_test.go`, `internal/async/metrics_test.go`, `internal/proxy/metrics_test.go`, `internal/storage/gc_metrics_test.go`, `internal/policy/metrics_test.go` and `internal/policy/feed_staleness_test.go` (`supply-chain-policy.md` AC9's per-source gauges), `internal/proxy/metadata_eviction_test.go` (`cache_metadata_bytes` and the dual-held blob, `proxy-cache.md` AC29), `internal/replication/metrics_test.go`, `internal/repository/metrics_test.go` (`repository-lifecycle.md` AC27) |
| AC7 | integration | `internal/telemetry/state_gauges_test.go` (two processes, one database, leadership handover) |
| AC8 | lint | `.golangci.yml` `sloglint` and `forbidigo` configuration, run by `make verify`; `internal/telemetry/lint_config_test.go` asserts the configuration is present with the stated options |
| AC9 | integration | `internal/telemetry/redact_test.go` (typed, key, scrub, URL layers, one counter each); `internal/auth/leak_test.go` (`auth.md` AC7's scan extended to spans and audit records, every AC31 form); `internal/upstream/redact_test.go` (every kind through the handler) |
| AC10 | unit + integration | `internal/telemetry/disclose_test.go` (AST walk); `cmd/stackweaver-registry/first_start_test.go` (two starts, one emission) |
| AC11 | integration | `internal/telemetry/request_log_test.go` (schema, one record per request, no query string, scrubbed path token, trusted proxies) |
| AC12 | unit + integration | `internal/telemetry/audit_test.go` (schema, extension sets, rejection dropped in production and failing the test under the recorder, truncation, rate limit; the vocabulary table diffed against the Design table in both directions, `unbound_hosts` on `repository.rename`, the eight `replication.*` events, `policy.rule.update`, `policy.feed.import` and the three `auth.session.*` events included, `method` on `issue` and `refused` only, the rate limit on the four refusal events and on neither `issue` nor `end`); the owners' emissions through `telemetry.NewTestRecorder`: `internal/auth/audit_test.go` (`auth.md` AC37: one record per refusal under its event, `auth.session.issue` per flow, `.end` on logout, `.refused` per cause, the per-address limit on an injected clock), `internal/repository/rename_hosts_test.go` (`repository-lifecycle.md` AC28), `internal/replication/metrics_test.go` (`replication.md` AC10), `internal/manage/replication_routes_test.go` (`management-api.md` AC33: `.sync` and `.reseed`, none for the link `GET`), `internal/manage/advisory_import_test.go` (`management-api.md` AC34: one `policy.feed.import` record, refused or applied), `internal/policy/audit_test.go` and `internal/policy/hosted_match_test.go` (`supply-chain-policy.md` AC5, AC25) |
| AC13 | integration | `internal/telemetry/audit_sink_test.go` (level independence, file append and `SIGHUP`, sink failure alert and request success) |
| AC14 | integration + conformance | `internal/telemetry/request_id_test.go` (validation, generation, correlation with request log, audit line and `Operation`); `conformance/core/request_id_test.go` (every response of a real client's session carries the header) |
| AC15 | integration | `internal/telemetry/context_handler_test.go` (fixture handler logging with `InfoContext`); `internal/telemetry/trace_test.go` (valid, invalid and missing `traceparent`; child spans per `Deps` call) |
| AC16 | integration | `internal/async/trace_link_test.go` (enqueue, run, link, audit `request_id`) |
| AC17 | unit | `internal/telemetry/alerts_test.go` (rules file parse, both-direction catalogue diff, metric names in expressions with histogram-derived series resolved and the templated values named in the header, `Alert` typing, counter on every call, the `Error` record once per minute with `suppressed`) |
| AC18 | integration | The owning packages' tests using the recorder: `internal/async/metrics_test.go`, `internal/index/virtual_merge_test.go`, `internal/signing/cadence_test.go`, `internal/proxy/upstream_removal_test.go`, `internal/proxy/integrity_test.go`, `internal/storage/read_verify_test.go`, `internal/verify/alert_test.go`, `internal/policy/scan_window_test.go`, `internal/policy/feed_staleness_test.go` (`supply-chain-policy.md` AC9's row: injected clock, quiet source stays clear, partial sync fires), `internal/replication/status_test.go`, `internal/upstream/cooldown_test.go`, `internal/model/pointer_test.go`; the rule-only conditions in `internal/telemetry/alerts_test.go` (rules evaluated with `promql` over recorded samples in and out of the driving state) |
| AC19 | integration | `internal/credential/display_once_test.go` (through the recorder); `internal/credential/metrics_test.go` |
| AC20 | integration | `internal/upstream/hygiene_test.go` and `conformance/core/upstream_hygiene_test.go` (header set at a recording stand-in under an active server span; shared with `upstream-adapters.md` AC4); `internal/replication/trace_test.go` (two instances, one trace) |
| AC21 | integration | `internal/telemetry/health_test.go` (unreachable dependencies, schema mismatch, both renderings, redaction, no repository or principal in any body, probe-storm cache) |
| AC22 | unit | `internal/format/register_test.go` (reserved segments `healthz`, `readyz`, `metrics`; the test `format-handler-interface.md` AC11 names) |
| AC23 | integration | `internal/telemetry/listener_test.go` (default absence on main, admin-only with the flag, existence-oracle refusal, pprof never on main) |
| AC24 | integration (scripts) | `scripts/bench-gate_test.sh` (synthetic results: regression, insignificant change, missing gate comment); `.github/workflows/ci.yml` job trigger asserted by `internal/telemetry/ci_config_test.go` reading the workflow |
| AC25 | integration (scripts) | `scripts/bench-gate_test.sh` (the named benchmark files, `internal/storage/bench_test.go` with both AC7's and AC22's gates included, carry `// gate:` comments and appear in the comparison) |
| AC26 | benchmark | `internal/telemetry/bench_test.go` (middleware per request; redaction handler with 1, 3 and 10 secrets), gated by AC24 |
| AC27 | unit | `cmd/stackweaver-registry/serve_test.go` (in-process command with flag, env and file sources); `internal/telemetry/boundary_test.go` (no Viper or Cobra import) |
| AC28 | integration | `internal/telemetry/shutdown_test.go` under `go.uber.org/goleak` |
| AC29 | integration | `internal/telemetry/catalogue_test.go` (bucket boundaries read off `/metrics`) |
| AC30 | integration + architecture test | `internal/telemetry/hijack_test.go` (fixture handler hijacking through `http.ResponseController` and by assertion, reporting and not reporting; the line, sample, `requests_total`, span and active-requests gauge through the recorder; compile-time assertion that the wrapper satisfies the reporter interface); `internal/format/refusal_writer_test.go` (the real `WriteRefusal` on a raw HTTP/1.1 socket, a fixture reporter two `Unwrap` levels down called once with the status and the body's length, a chain with no reporter still answered on the wire; shared with `supply-chain-policy.md` AC18 and `format-handler-interface.md` AC14); `internal/format/arch_test.go` (`format-handler-interface.md` AC14's assertion that `Hijacked` has a single non-test call site, the writer's, so no handler reports a size of its own) |
| AC31 | integration + architecture test | `internal/proxy/revalidate_job_test.go` on the production runner through the recorder (no request log line, no `http_server_*` sample, no `requests_total` increment, the `Deps` and upstream spans under the job span, `job_id`, `kind` and `request_id` on every record and no `principal`, the discarded body's marker string absent; shared with `proxy-cache.md` AC26 and `async-operations.md` AC30); `internal/telemetry/boundary_test.go` (no import of the composition root package or `internal/proxy`, no reference to the marker symbol) |

## Implementation Phases

### Phase 1: The baseline (charter step 2, with generic)
- `internal/telemetry`: `Config`, `New`, `Shutdown`, the operational logger with the context and
  redaction handlers, `Secret`, `MarkSecret`, `Disclose`, `RedactURL` (AC8, AC9, AC10, AC27, AC28)
- The middleware: request id, request span, request log, HTTP semconv metrics, the
  `ResponseWriter` wrapper with `Flusher`, `Hijacker`, `Unwrap` and the reporter interface
  (AC11, AC14, AC15, AC30)
- The catalogue table, the typed instrument handles for `HTTP`, `Storage`, `Auth`, `Manage`,
  `Repositories`, the Prometheus exporter, the telemetry listener, `/metrics` (AC4, AC5, AC23,
  AC29)
- `/healthz`, `/readyz`, `component_up`, the reserved segments (AC21, AC22)
- The audit channel: `Auditor`, the event table with the `auth.*`, `admin.*`, `manage.*`,
  `repository.*` and `credential.*` events, the sinks (AC12, AC13)
- The alert mechanism, `alerts.yaml` with the baseline rules, the catalogue test (AC17)
- The four enforcers (AC1, AC2, AC3, AC8)
- The benchmark-gate mechanism, `make bench`, the CI job, this package's budgets (AC24, AC26)

### Phase 2: Storage, GC and the proxy (charter steps 3 and 4)
- `Metrics.GC`, `Metrics.Cache`, `Metrics.Upstream` handles and rows; the `Deps` decorators for
  the blob store, metadata store and fetch-and-cache; the pgx tracer (AC3, AC6, AC7)
- The propagation policy at the upstream adapter and the storage benchmark under the gate
  (AC20, AC25)
- The GC, cache (`CacheMetadataLarge` included), upstream and integrity alerts (AC18)
- `WithJob` and the per-job secret set on the runner, the replay's signal shape with
  `proxy.revalidate` (AC31)

### Phase 3: Verification, policy, async, signing (charter steps 4b to 7)
- `Metrics.Verify`, `Metrics.Policy`, `Metrics.Async`, `Metrics.Signing`, `Metrics.Credentials`
  handles and rows; state-derived gauges on the leader (AC6, AC7)
- Queue span links and `Job.trace_context` (AC16); the remaining audit events (AC12)
- The remaining alerts and the sibling benchmarks under the gate (AC18, AC19, AC25)

### Phase 4: Replication (charter step 10)
- `Metrics.Replication` rows, link-state gauges, peer propagation, the replication alerts
  (AC6, AC18, AC20)

## Tasks

Left empty by `/spec`. Populated by `/tasks` once the spec reaches `planned`.

## Open Questions

None open. Eight decisions were needed where the citing specs left the shape open or pulled in
different directions, and a ninth was raised on the Fable follow-up of 2026-10-01; each is
recorded below in the template's decision shape and adopted under the owner's standing
delegation, folded through Design, the criteria and the Test Plan in the same pass.

### Resolved: one metrics API or two (was Q1)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the OpenTelemetry
metric API with the Prometheus exporter, and the OTel trace API for spans, so the module has one
telemetry API and one SDK dependency. Accepted cost: the exporter's name translation means the
catalogue must state both spellings, and the exporter's translation strategy is pinned so a
library upgrade cannot silently rename a series; AC4 catches a rename as a catalogue diff.
Option B lost because tracing needs the OTel SDK regardless, so `client_golang` would be a
second metrics stack with its own registry, its own test helpers and its own naming rules to
reconcile with the semconv metrics; Harbor's choice of `client_golang` predates a usable OTel
metrics SDK.

**Recommendation:** A. One API for metrics and traces, semconv names for free, one boundary to
enforce.

| Option | You get | It costs |
|---|---|---|
| **A. OTel API + Prometheus exporter** (adopted) | One SDK, semconv metrics and traces from one instrumentation, standard collectors interoperate | Name translation to pin; a heavier dependency than `client_golang` alone |
| **B. `client_golang` for metrics, OTel for traces** | The most mature Prometheus client and its `testutil`; Harbor's shape | Two registries, two naming schemes, two test helpers, and semconv HTTP metrics re-implemented by hand |

**Why this is yours:** a dependency choice at the foundation that every package inherits and that
cannot be swapped without touching every instrument.

Rechecked on Fable 2026-10-01: confirmed, and amended in its fold, which had under-stated the
"translation strategy is pinned" cost. The Prometheus exporter's `WithNamespace` option would
prefix the semconv family as well, so the `stackweaver_registry_` namespace has to live in each
registry-specific instrument's OTel name and never in an exporter option; the exporter adds
`otel_scope_name` and `otel_scope_version` labels to every series unless constructed with
`WithoutScopeInfo()`, which would have failed AC4's closed vocabulary on day one; and
`target_info` plus the standard collectors' families are the only series outside the table. All
three are now stated in Design ("Naming convention") and asserted by AC4, so a library upgrade
that changes any of them fails the catalogue diff rather than renaming a dashboard's series.
Option A still wins for the reason given: tracing needs the OTel SDK regardless.

### Resolved: how alerts exist (was Q2)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: an alert is a catalogue
name, a counter, an `Error` record and a shipped Prometheus rule; the registry sends nothing.
Accepted cost: an operator with no rules engine sees alerts only as log lines and a counter, and
must install Alertmanager or equivalent to be paged. Option B lost because a notifier is a
second delivery system with its own configuration, retries, secrets (SMTP, webhook tokens) and
egress, duplicating what every monitoring stack already does, and its correctness cannot be
tested without standing up the destinations. Option C lost because a gauge alone cannot express
"exactly once per condemnation" and leaves no record when the condition clears.

**Recommendation:** A. Alerts as rules over catalogue metrics, with a record for forensics.

| Option | You get | It costs |
|---|---|---|
| **A. Counter + `Error` record + shipped rules** (adopted) | Testable end to end from the catalogue; any engine routes it; one emission path | Needs an external rules engine to page anyone |
| **B. Built-in notifier (webhook, email)** | Pages without a monitoring stack | A second delivery system to configure, secure and test; new egress from the registry |
| **C. Gauges only** | Simplest | No once-only semantics, no record after the condition clears |

**Why this is yours:** it fixes what "raises an operator alert" means in eleven sibling specs.

Rechecked on Fable 2026-10-01: confirmed, and amended in one under-stated cost. An `Error`
record per call is right for a condemnation and wrong for an event condition under load: one
bad mirror can raise `FetchIntegrityFailure` a thousand times a minute, and the operational log
would become the incident. The counter still increments on every call, which is what the rules
fire on; the `Error` record is now emitted once per (`alert`, minute) per process with a
`suppressed` count on the next, the same shape the `auth.credential.*` audit events already use
(Design, "Alerts"; AC17). The record also now says which conditions are rule-only with no
emitting site, so "exactly once per driving scenario" is asserted where a call site exists and
the rule's truth value where none does (AC18).

### Resolved: the audit channel (was Q3)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a separate `slog` stream
with its own sink and no level filter, a closed event vocabulary with per-event extension
attributes, and a sink failure that alerts but does not fail the request. Accepted cost: an
operator can lose audit records if the sink fails and nobody acts on `AuditSinkFailing`. Option
B lost because a level-filterable operational log lets one configuration change silence the
audit trail, and a SIEM cannot tell an audit record from an operational one by anything but a
field. Option C (fail the request when the audit write fails) lost because it turns a full disk
into an outage of every state-changing route, which is the incident the audit log exists to
explain, not to cause; the resolved question notes it is reversible by the owner if a
compliance regime requires write-through auditing.

**Recommendation:** A. A distinct, unfilterable stream that degrades loudly rather than
blocking.

| Option | You get | It costs |
|---|---|---|
| **A. Separate stream, alert on sink failure** (adopted) | Complete by construction, SIEM-separable, requests unaffected by a full disk | Records can be lost if the alert is ignored |
| **B. Operational log with an `audit=true` field** | One stream to ship | Silenceable by a level change; SIEM filtering by field |
| **C. Separate stream, request fails on sink failure** | Never a missing record | A full disk is a registry outage |

**Why this is yours:** it trades availability against audit completeness, which is a posture
decision.

Rechecked on Fable 2026-10-01: confirmed, with its cost stated more honestly. Option B was
rejected for being "one stream a SIEM can only separate by a field", yet the adopted default
sink is `stdout`, which the operational and request logs also write to, so at the descriptor
level the default is exactly that shape. What A keeps that B lacked is the level-independence,
the closed schema and the `file` and `stderr` sinks; what it did not have was a field to route
on, which every record on every stream now carries as `stream` (Design, "Structured logging",
"The audit log"; AC11). The default stays `stdout` because a container runtime collects it
without configuration and the rule against a silenceable audit trail is about the level, not
the descriptor; an operator who wants separate descriptors sets `stderr` or `file`. Also
amended: `Emit`'s rejection of an unregistered event was written as "panics under the
race-enabled build", which is not a Go mechanism; the recorder now holds the `testing.TB` and
fails the test, production drops with an `Error` (AC12). The write-through alternative stays
recorded as the owner's to choose.

### Resolved: trace propagation to upstreams (was Q4)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: no `traceparent` or
`tracestate` on requests to upstreams; both on requests to replication peers. Accepted cost: an
upstream-side trace (an operator who also runs the upstream Artifactory) cannot be joined to
ours by trace id, only by time and URL. Option B lost because it changes the header set of
recorded traffic the corpus replays against, can leak `tracestate` vendor entries to a third
party, and gives the upstream a correlation handle across requests it has no need for.

**Recommendation:** A. Propagate inside the operator's own estate, never outside it.

| Option | You get | It costs |
|---|---|---|
| **A. Peers yes, upstreams no** (adopted) | No third-party leakage; corpus header sets unchanged; cross-instance replication traces | An operator-owned upstream cannot join our trace |
| **B. Propagate everywhere** | Every hop joinable | Header set changes under the corpus; `tracestate` leaks; a correlation handle handed to third parties |

**Why this is yours:** what the registry sends to someone else's server is a privacy posture.

Rechecked on Fable 2026-10-01: confirmed. Verified against `upstream-adapters.md` AC4 as it
stands (the pair on the forbidden outbound set, the transport built without the propagating
round-tripper, the conformance case shared with AC20 here) and `replication.md` AC10 (a
follower's requests carry both). One clarification the record lacked: a follower's sync runs as
a `replication.sync` job, so the trace the leader joins is the job's, linked to the enqueuing
request where one exists and a root of its own for a scheduled sync (Design, "Across the
queue"); "one trace spans both instances" holds either way. Nothing else in the 2026-09-30 and
2026-10-01 Fable decisions touches this propagation boundary.

### Resolved: where `/metrics` lives (was Q5)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a second, unauthenticated
listener for `/metrics`, detailed `/readyz` and pprof, not exposed publicly; the main listener
carries status-only probes and, only by explicit flag, an admin-token-gated `/metrics`. Accepted
cost: a second port to open in the deployment, and a single-port deployment must opt into the
gated route. Option B lost because a `/metrics` on the client-facing listener is a route that
reveals repository names through labels to anyone who obtains an admin token, and because
scrape authentication on the main listener means the scraper holds a registry credential. Option
C (Nexus's privilege-gated route only) lost for the same reason plus the operational one that
Kubernetes probes and Prometheus scrapes would then share a listener with client traffic and its
rate limits.

**Recommendation:** A. Harbor's shape: operational routes on an operational port.

| Option | You get | It costs |
|---|---|---|
| **A. Separate listener, gated main-listener route optional** (adopted) | Scrapers hold no registry credential; operational traffic off the client port | A second port |
| **B. `/metrics` on the main listener, admin token** | One port | A scraper with a registry credential; labels visible to any admin-token holder |
| **C. Main listener, privilege-gated, no second port** | Nexus's shape | As B, plus probes and scrapes contend with client traffic |

**Why this is yours:** a deployment-surface decision every packaging recipe inherits.

Rechecked on Fable 2026-10-01: confirmed, and amended in what the record left implicit.
`auth.md`'s recheck of 2026-09-30 raised that the per-repository labels reveal private
repository names to any reader of `:9464`, which the listener decision had used as an argument
against options B and C without saying that A discloses the same names to whoever reaches the
second port. Design ("The telemetry listener") now states the disclosure and makes it the
reason the listener is never public (`deployment.md` AC13 holds the chart to that), the reason
the main-listener mount needs an admin token (an admin can already list every repository, so
the route adds nothing to its only reader) and answers `not-found` to everyone else under the
existence oracle (AC23), and names the `repository_label_limit: 0` collapse as the opt-out for
an operator whose scrape path is less trusted than their admin. Hashing and an opt-in default
were weighed there and lost. The decision itself stands.

Fable follow-up 2026-10-01: the disclosure statement was written for `repository` alone, and
`upstream-adapters.md`'s recheck pointed out that an upstream's name is just as operator-chosen
and just as private; checking that claim found `server_address` on the client histogram
carrying the upstream's host under no cap at all. The statement now covers every
configuration-bounded label by class, `server_address` is capped with `upstream`, and
`name_label_limit: 0` is the opt-out for the name labels as `repository_label_limit: 0` is for
repository names (Design, "The telemetry listener", "Cardinality"; AC5). The chart's scrape
object is a `PodMonitor`, as `deployment.md` AC13 renders it, not the `ServiceMonitor` the
record said. The decision still stands.

### Resolved: per-repository labels (was Q6)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `repository` is admitted
on named per-repository metrics only, through a per-process cap that collapses to `_other` with
an overflow counter. Accepted cost: an installation with more repositories than the cap sees
per-repository detail for the first thousand it touches after start and `_other` for the rest,
until the operator raises the cap. Option B lost because a registry whose quota utilisation is
invisible per repository cannot answer `proxy-cache.md`'s "quota set too low presents as the
proxy being slow", and Harbor's operators evidently want the per-project gauge. Option C
(unbounded) lost because it is the cardinality failure the Prometheus guidance warns of and
would be the first thing an operator of a large installation disables.

**Recommendation:** A. Per-repository where the meaning is per repository, capped and counted.

| Option | You get | It costs |
|---|---|---|
| **A. Admitted on named metrics, capped** (adopted) | Quota, thrash, pins and staleness per repository; bounded series count | Detail beyond the cap collapses until raised |
| **B. Never per repository** | Bounded by construction | Quota utilisation only in aggregate, which is useless for finding the one repository thrashing |
| **C. Unbounded** | Full detail always | Series explosion on large installations |

**Why this is yours:** a cost that lands on the operator's Prometheus, not on the registry.

Rechecked on Fable 2026-10-01: confirmed, and amended in three places where the fold was
incomplete. First, the accepted cost omitted the disclosure: a repository name is private
information on a private registry, and every per-repository series carries it to whoever reads
the telemetry listener; that is now the stated cost, answered by the listener never being public
(the resolved listener question as amended) and by a cap of `0`, which collapses every value to
`_other` and is the opt-out an operator with a less-trusted scrape path takes (Design,
"Cardinality"; AC5). Second, a configuration-bounded label was, as written, fillable from the
wire: `requests_total{repository}` on a request naming a non-existent repository would have
taken the path segment, so a client enumerating guesses could exhaust the cap and collapse the
real repositories into `_other`; the value is now the resolved row's name only, with `_none` for
the rest (AC5). Third, "the first thousand it touches" had no meaning for a state-derived gauge
the leader recomputes every interval; the collector now exports the first N by identity and
folds the rest into `_other` with an aggregation the row names, so the residue is still a
number a rule can use. `cache_metadata_bytes{repository}` joins the admitted set under the same
rule (`proxy-cache.md` AC29). Option A stands: per-repository where the meaning is per
repository, capped, counted, and now not client-fillable.

Fable follow-up 2026-10-01: `index_requested_cells{repository}` joins the admitted set
(`signing-service.md`'s resolved requested-cell decision, was Q22, and AC35), state-derived
with `_other` at its maximum, since a virtual at its cap is what the gauge exists to show. The
same pass found a label this decision had not accounted for: `schedule` had no stated value,
and `async-operations.md`'s per-pointer and per-repository schedules would have put repository
and pointer names on it outside this cap. That is settled as its own decision below (was Q9).

### Resolved: the benchmark-gate mechanism's home (was Q7)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: this spec owns `make
bench`, `scripts/bench-gate.sh`, the checked-in baseline and the CI job, and the siblings own
their budgets as `// gate:` comments. Accepted cost: a spec about signals also owns a build
script, and the constitution's cost accounting charges the gate to `shared:observability`.
Option B (each sibling builds its own comparison) lost because five specs would ship five ways
to compare against five baselines and the first divergence in threshold semantics makes the word
"regression" mean different things in the same CI run. Option C (`deployment.md` owns it) lost
because deployment packages what runs, and a CI gate is evidence tooling that runs before
anything is packaged.

**Recommendation:** A. One gate, budgets beside the benchmarks they bound.

| Option | You get | It costs |
|---|---|---|
| **A. Mechanism here, budgets in each spec** (adopted) | One comparison, one baseline format, one job; budgets stay with the code they bound | This spec owns a script and a workflow |
| **B. Each sibling its own gate** | No cross-spec dependency | Divergent semantics and duplicated tooling |
| **C. `deployment.md` owns it** | Build tooling in one place | A CI gate is not a deployment artefact and would wait on that spec |

**Why this is yours:** ownership of a cross-cutting piece of CI that the constitution names but
no spec claimed.

Rechecked on Fable 2026-10-01: confirmed, and amended in one under-stated cost. A gate on
shared CI runners detects only regressions larger than the runner's own noise, and a `// gate:`
threshold tighter than that noise trips on nothing, gets disabled, and leaves the
"correct-and-slow, noticed in two months" outcome the constitution names with a gate that looks
present. The baseline now records each benchmark's run-to-run variance and the script refuses a
threshold tighter than it, naming both numbers (Design, "Benchmark gates"; AC24), so every
sibling's budget is either honest or refused. Also stated: a regression is found on `main` after
the merge, the same accepted shape as conformance, and is answered by a revert or fix, never a
relaxed gate. The five siblings' `// gate:` comments verified present at HEAD
(`storage-and-gc.md` AC7 and AC22, `async-operations.md` AC25, `artifact-verification.md`
AC26, `signing-service.md` AC28) and `project-charter.md` AC6 cites this mechanism by name.

### Resolved: the query string in the request log (was Q8)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: never log the query
string, in any form. Accepted cost: a request whose meaning is in its query (a search, a
paginated listing's cursor) is logged as its path and route only, and diagnosing it needs the
trace or the client's own record. Option B lost because the credential-bearing query forms
(`vagrant.md`'s access token parameter, presigned `X-Amz-*` and `X-Goog-Signature` on redirected
fetches, `access_token` on several OAuth-shaped upstreams) would each need a redaction entry
kept current against every format, and one missed entry is a leak on every request; no format
spec's criteria need the query logged.

**Recommendation:** A. Absence is the only redaction that cannot fall behind.

| Option | You get | It costs |
|---|---|---|
| **A. Never logged** (adopted) | No query-borne credential can leak; nothing to keep current | Query-driven requests diagnosed by route and trace only |
| **B. Logged with a redaction list** | Search and cursor values visible | A list that must be complete for every format forever |

**Why this is yours:** a diagnosability-versus-leak trade the operator lives with.

Rechecked on Fable 2026-10-01: confirmed, and amended in its fold. The rule was written for the
request log and left the request span unstated, while the semconv server span carries
`url.query` as a conditionally required attribute and AC9 scans spans as an output; the span
now carries `url.path` scrubbed as the log's is and no `url.query` or `url.full` (Design,
"Tracing"; AC15). The upstream client span keeps `url.full` after `RedactURL`, which is the
adapter's redactor and a different rule (a fetch URL is the operator's configuration, not a
client's input), and that difference is now stated where the spans are listed. Option A
stands: absence cannot fall behind.

### Resolved: what the `schedule` label carries (was Q9, raised and adopted 2026-10-01)

**Adopted 2026-10-01 under the owner's standing delegation**, in the Fable follow-up. Option A:
`schedule` is the schedule's kind, or the kind with its `source` or `link` name for a
per-source or per-link schedule, and never a repository or pointer name; a repository- or
pointer-scoped kind (`signing.resign`, `retention.pass`) is exported as one series per kind
carrying the most overdue enabled row's `last_run` and `period`, so `ScheduleOverdue`'s rule over
that series is true exactly when some row of the kind is overdue (Design, "Cardinality"; the
catalogue row; AC5). Accepted cost: the metrics say that a `signing.resign` schedule is
overdue, not which repository's or which pointer's; that comes from the jobs administration
routes (`async-operations.md` AC21), as per-principal accounting comes from the API. It is
owner-facing.

The question: `async_schedule_last_run_timestamp_seconds{schedule}` and
`async_schedule_period_seconds{schedule}` were in the catalogue with `schedule` listed as
configuration-bounded, but no spec said what the value is. `async-operations.md` keeps one
schedule per signed pointer and one per repository with a repository-scoped document, beside the
per-source, per-link and instance-wide ones (its "The scheduler"). A value made from the row's
identity would carry pointer names, which are content and so forbidden as label values
outright, and repository names, which the `repository` cap and its `0` opt-out exist to bound
and which this label would have carried past both.

**Recommendation:** A, because it keeps the cardinality rule whole (no content-chosen value, no
repository name outside the one cap that governs them), keeps the two series and the rule
every sibling already cites unchanged, and loses only a lookup the API answers.

| Option | You get | It costs |
|---|---|---|
| **A. Kind, or kind with a `source` or `link` name; scoped kinds folded to their most overdue row** (adopted) | No pointer or repository name on the label; the catalogue names and the rule unchanged; `repository_label_limit: 0` stays a complete opt-out | Which repository or pointer is overdue comes from the API, not the series |
| **B. One series per schedule row, repository-scoped values under the `repository` cap** | The overdue row named in the series | Pointer names as label values, which the rule forbids; a cap that collapses the signal to `_other` on a large installation, where the overdue pointer is then unnamed anyway; one more place a repository name is disclosed |
| **C. Drop the per-schedule gauges for a count of overdue schedules per kind** | Simplest label set | A new metric name in place of two that `async-operations.md` AC20 already asserts, and the lag itself (how overdue) lost |

**Why this is yours:** it trades a named overdue schedule in the metrics for a label that can
never leak a repository or pointer name, which is the disclosure posture this spec's listener
decision rests on.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | 677aa69 | authoring pass: grounded first draft, not a review | Not a review. Gathered the requirements of thirteen citing foundation specs and twelve format specs (grep over `docs/internal/plans` for `metric`, `gauge`, `alert`, `audit line`, `slog`, `X-Request-Id`, `observab`), the queued consequences naming this file (credential-management item 14, signing-service item 15, upstream-adapters item 14, async-operations item 14) and the foundation.tsv hints, and `project-charter.md`'s step 2 placement. Grounded the design in OpenTelemetry HTTP and database semantic conventions, Prometheus naming guidance, the OTel Prometheus exporter's translation, Harbor's exporter and registry metrics, Artifactory's Open Metrics enablement, Nexus's metrics and health endpoints, Gitea's metrics and request-id settings, Pulp's OTel telemetry, Go's `log/slog` and W3C Trace Context, all fetched this run. Wrote eight decisions in the template shape and adopted each under the standing delegation. 29 criteria, each with a Test Plan row. Tree claims are vacuous at this sha (stub `main.go` only) and are stated as design. Sibling consequences reported to the spec loop rather than applied. Stays `draft`. |
| 2026-09-28 | ff7966e | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file verified against the source spec's current text before applying. Catalogue completeness: every metric name in `upstream-adapters.md` AC31, `async-operations.md` AC20, `signing-service.md` "Observability", `proxy-cache.md` "What ends a cached reference's life", `storage-and-gc.md` AC28, `supply-chain-policy.md` AC5/AC6, `artifact-verification.md` AC27, `replication.md` AC10, `credential-management.md` AC5 and `repository-lifecycle.md` AC27, and every alert name those specs raise, was grepped against the metric and alert tables; all present, none added. Audit vocabulary extended per credential-management and repository-lifecycle reconciliation item 1: `credential.robot.update`, `.read`, `.list`, `credential.key.read`, `.list`, `credential.trust.set`, `.delete`, `.read`, `repository.configure` (extension `changed_fields`), with `.detach` and `.reclaim` placed; AC12 names them. Citations turned from owed consequences into applied criteria: the dependency table (every row), the boundary table (`internal/format/arch_test.go` now asserts the handler import rule), `storage_blob_digest_mismatches_total` and `BlobDigestMismatch` (storage-and-gc AC21, AC28), `GCSweepStale` and `PinnedStorageOutOfWindow` (AC28), `AdvisoryFeedDegraded` (supply-chain AC9), `UpstreamRateLimitLow`/`UpstreamCooldown` (upstream-adapters AC31), `SchedulerLeaderless` (async AC20), `ReplicationLagHigh` (replication AC10), the queue's `trace_context`/`request_id` (data-model AC41), the propagation policy (upstream-adapters AC4, sharing `conformance/core/upstream_hygiene_test.go` with AC20), the benchmark list and AC25 (storage-and-gc AC22), `deployment.md` no longer "owed" for the `telemetry.*` keys, the charter's Phase 1 and Phase 2 placement. AC6's Test Plan row gained `internal/repository/metrics_test.go`. No em-dashes or en-dashes. `node scripts/check-spec.js`: zero failures for this file. Stays `draft`. |
| 2026-09-28 | 1848c7d | closing reconciliation on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied the two items in `agents/spec-loop/consequences.md` targeting this file that the progress log does not show applied, each verified against the owning spec's settled text. (1) The six-spec closing sweep item 4: `unbound_hosts` joins `repository.rename`'s extension set beside `previous_name` (`repository-lifecycle.md`'s resolved hostname-binding decision, was Q10, its "Audit and metrics", AC27 and AC28); the audit table row, the dependency-table row and AC12 name it, and AC12's Test Plan row cites `internal/repository/rename_hosts_test.go`. (2) SWEEP 2's leftover: `replication.link.create`, `.update`, `.delete`, `.takeover`, `replication.export` and `replication.import` confirmed present with `link` and `leader` against `replication.md` ("What a monitor sees", AC10) and `management-api.md`'s endpoint table, and `policy.rule.update` against `supply-chain-policy.md` AC5 and AC25; the audit table now cites the routes that emit each and states that `policy.rule.update` covers a `coordinate_exemptions` change with `rule` and `coordinate` from the existing extension set (no new attribute); AC12 names all seven and its Test Plan row adds the owners' recorder tests. Every other item targeting this file (data-model 9, storage-and-gc 3, supply-chain 6, replication 8, credential-management and repository-lifecycle 1, upstream-adapters and async-operations 4) re-checked as already applied. Found and reported, not applied: the replication `sync` and `reseed` routes and the link `GET` have no registered audit event although `management-api.md` says every request to its API emits one, and `management-api.md` AC23 says every such record is a `manage.*` event while its own Design registers lifecycle, credential, replication and policy events under their owners; both are the owning specs' to settle first, per this spec's rule that an event is named by its owner before it is added here. No question adopted, so no `fable_recheck` change. `node scripts/check-spec.js`: zero failures for this file. Stays `draft`. |
| 2026-10-01 | 4fcbbd4 | Fable recheck: full review (claim verification at HEAD of every sibling citation: `supply-chain-policy.md` AC5, AC6, AC9, AC16, AC18, AC25 and its was-Q13 and was-Q10 as amended; `management-api.md` "Audit", AC23 as amended, AC33, AC34 and its endpoint table; `credential-management.md` AC4, AC5, AC18 as amended and its `credential.prune` job; `format-handler-interface.md` "The pinned method set" with the authorizer removed from `Deps`, the `WriteRefusal` contract, AC11, AC14, AC15, AC18; `proxy-cache.md` AC10, AC13, AC14, AC29 and its was-Q21 as amended for the dual-held blob; `rpm.md` was-Q11; `auth.md` AC7, AC15, AC17, AC31, AC36; `async-operations.md` AC14, AC20, AC26, AC27, AC30 and its no-principal rule; `replication.md` "What a monitor sees", AC10, AC21; `storage-and-gc.md` AC7, AC19, AC21, AC22, AC28; `signing-service.md` "Observability", AC14, AC15, AC17, AC19, AC22, AC28; `upstream-adapters.md` AC4, AC20, AC31; `artifact-verification.md` AC26, AC27; `repository-lifecycle.md` AC27, AC28; `data-model.md` AC41; `deployment.md` AC13, AC27 and its `telemetry.` inventory row of 17 keys; `conformance-harness.md` AC13 and its core-case list; `project-charter.md` steps 2, 3, 10 and AC6; the tree still holds only `cmd/stackweaver-registry/main.go`, so no code claim was checkable) + adversarial lens at full strength on the cloud-authored whole + constitution + go-spec-reviewer inline + re-examination of the eight adoptions made without Fable | Brought current first: every open consequence against this file applied and verified against its source's current text (eviction-settlement item 1 and proxy-cache recheck item 2: `cache_metadata_bytes{repository}` in the catalogue, AC6, the multi-replica list and a rule-only `CacheMetadataLarge`, the dual-held blob counted there only while declared; format closing sweep batch 2 item 3, the same; supply-chain recheck item 3: the `Hijacker` wrapper (AC30) and `AdvisoryFeedDegraded` on the last completed sync or the declared export time, per source, with `policy.feed.import` registered; management-api recheck item 1: `replication.link.sync`, `.reseed` and `policy.feed.import` registered and "every request" corrected to "every write past the authorizer" in the dependency row, the vocabulary row and the Emission paragraph, credential-management's reads named as the exception; auth recheck item 5: the disclosure stated as the reason the listener is never public, with the `repository_label_limit: 0` collapse as the opt-out; format-handler-interface recheck item 1: the wrapper and the replay labelled by job kind and absent principal, never the marker (AC31); the closing sweep's own items 1 and 2 found settled upstream). Verdicts: Q1 confirmed and amended (the exporter's translation pinned concretely: prefix in the instrument name, `WithoutScopeInfo()`, `target_info` and the standard collectors as the only series outside the table; AC4); Q2 confirmed and amended (the `Error` record once per alert per minute with `suppressed`, the counter on every call; rule-only conditions named; AC17, AC18); Q3 confirmed and amended in cost (the default `stdout` sink shares the descriptor, so every record on every stream carries `stream`; `Emit`'s "panic under the race build" replaced by the recorder failing the test; AC11, AC12); Q4 confirmed (a sync's trace is the job's); Q5 confirmed and amended (the disclosure stated and made the reason); Q6 confirmed and amended in three places (the disclosure as its cost, the `repository` value taken from the resolved row and never the path so the cap cannot be filled from the wire, the state-derived `_other` as an aggregation the row names; AC5); Q7 confirmed and amended (the baseline records variance and the script refuses a gate tighter than it; AC24); Q8 confirmed and amended (the request span carries no `url.query` or `url.full`; AC15). None superseded. Refuted and fixed beyond the adoptions: `Deps` was said to carry "the authorizer", which `format-handler-interface.md` corrected out on 2026-10-01 and this spec had copied, and the decorated set now lists what `Deps` carries at HEAD; `telemetry_audit_sink_failures_total` and `telemetry_disclosures_total` were used by AC13, AC10 and a rule without being catalogue rows, so AC4 and AC17 would have failed themselves; `HighErrorRate` read a histogram's `_count`, which AC17 forbade as written; `UpstreamRateLimitLow` was prose, not an expression; AC14 named a "replication listener" that does not exist (the replication routes are a mount on `main`, `deployment.md` "Listeners"); `MarkSecret` registered a value "on the context", which is immutable, so the middleware and the job runner now install the set; `Secret` had no accessor for its own value; the `format` label lacked `ui` and `_none`. go-spec-reviewer inline: consumer-side interfaces (the reporter declared in `internal/format`, the recorder holding `testing.TB`), the wrapper reachable through `Unwrap` for `http.ResponseController`, errors and context explicit, every goroutine with `Shutdown` as its path, one package with one domain; approved after the fixes. Constitution: both paths (the hosted and proxied request shapes both pass one middleware and the replay is accounted for separately), the shared model (no table here, `Job.trace_context` is `data-model.md`'s), no handler owns a signal (AC2), a named enforcer per boundary (four, plus the wrapper's compile-time assertion), the conformance gate untouched, findings in the doc; nothing weakens `auth.md` AC10. 31 criteria, each with a Test Plan row; Open Questions empty; `node scripts/check-spec.js`: zero failures on this file; no em-dashes on touched lines. Sibling consequences reported to the orchestrator, not applied: `format-handler-interface.md` (the reporter interface beside `WriteRefusal`), `deployment.md` (two more templated values for `alerts.yaml`), `supply-chain-policy.md` (the `source` label and the import event's attributes), `replication.md` (`.sync`, `.reseed`, "listener" wording), `async-operations.md` (`WithJob` and the per-job secret set), `proxy-cache.md` (AC26's shared replay-signal assertions), `web-ui.md` (`format=ui`), `question-triage.md`. `fable_recheck` cleared; draft to planned. |
| 2026-10-01 | a27dea9 | Fable follow-up: queued cross-spec items since the recheck | A review, narrower than the recheck: every item in `agents/spec-loop/consequences.md` targeting this file after the 4fcbbd4 row collected (deployment recheck 6, upstream-adapters recheck 2, web-ui recheck 3, signing-service follow-up 2, auth follow-up 1, async follow-up 3; every earlier item re-found applied at 4fcbbd4), each verified against the current text of its source spec and of this one, then read adversarially against the rest of this spec. Applied, six of six. (1) deployment recheck 6 (`deployment.md` AC13, "Listeners"): the scrape object is a `PodMonitor` on the container port, never a `ServiceMonitor`, in the dependency row, the disclosure paragraph and the was-Q5 note. (2) upstream-adapters recheck 2 (its AC31): the disclosure statement now covers every configuration-bounded label by class, the six `upstream_*` series and `http_client_request_duration_seconds` named, with `name_label_limit: 0` as the opt-out beside `repository_label_limit: 0`; checking the opt-out claim found two more holes and closed them: `server_address` carried the upstream's host under no cap and is now configuration-bounded under `name_label_limit` (the catalogue row, the configuration table, AC5 and `labels_test.go`), and `schedule` had no stated value while `async-operations.md` keeps schedules per pointer and per repository, so a row-identity value would have carried pointer names (content, forbidden outright) and repository names outside the `repository` cap; settled as Q9, raised in decision shape and adopted under the standing delegation, owner-facing: the kind, or the kind with a `source` or `link` name, scoped kinds folded to their most overdue row so `ScheduleOverdue`'s rule and the two catalogue names stand (Design "Cardinality", the catalogue row, the multi-replica list, AC5 with `internal/async/metrics_test.go` shared with async AC20, AC18's parenthetical). (3) web-ui recheck 3 and auth follow-up 1 (`auth.md` "Audit events", AC37; `credential-management.md` AC18): `auth.session.issue` (`method`), `.end` (none) and `.refused` (`method`, `reason`) registered beside the three refusal events, whose row now carries auth's causes and AC37's one-record rule; the per-address rate limit stated on the four refusal events and on neither `issue` nor `end` (AC12, which had said `auth.credential.*` while Design already limited `auth.access.denied`, now names all four; `internal/auth/audit_test.go` on AC12's row); the credential vocabulary row aligned to AC18 ("passes the shared authorizer", a refused request leaving the authorizer's record and none from that package); the auth dependency row cites AC37. (4) signing-service follow-up 2 (its was-Q22, AC35, "Observability"): `index_requested_cells{repository}` in the catalogue, state-derived, leader-exported, `_other` at its maximum, in the admitted per-repository list, the disclosure list, the multi-replica list, AC5's aggregation examples, AC6 with `internal/index/virtual_remote_member_test.go` on its row, the signing-service dependency row and the was-Q6 note. (5) async follow-up 3 (its "Claim", AC27): the `WithJob` sentence is a citation with `internal/async/trace_link_test.go` named, no longer "a consequence reported"; the async dependency row cites AC27 and its schedule shapes. Declined: none. Adversarial check of what changed: a `schedule` fold by the minimum `last_run` with the minimum `period` would false-positive across rows, so the fold is the single most overdue row's pair, true within one `state_interval`; `method` on `auth.session.end` is rejected, not admitted, so AC12 says so; the semconv `server.address` requirement is met by `_other` as a value, and the client span's `url.full` is unaffected (OTLP, not the listener). No pinned method, `Deps` interface, mark root or `auth.md` AC10 touched. No em-dashes or en-dashes. 31 criteria, each with a Test Plan row; nine questions resolved, zero open; `node scripts/check-spec.js` on this file: zero failures. Sibling consequences reported, not applied: `async-operations.md` (the `schedule` value shape and the most-overdue fold on AC20's row and "The scheduler"; `internal/async/metrics_test.go`), `upstream-adapters.md` (`server_address` capped with `upstream`, wording on AC31), `deployment.md` (not edited here: `name_label_limit: 0` beside `repository_label_limit: 0` in its disclosure sentence, and `server_address` in the key's meaning if it restates it), `signing-service.md` (optional: the gauge is leader-exported and folds by maximum). Stays planned. |
| 2026-10-01 | 16da951 | Fable follow-up: queued cross-spec items since the recheck (round 2) | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, every item targeting this file after the a27dea9 row collected (supply-chain-policy follow-up 2, round-2 async-operations follow-up 2, format-handler-interface follow-up 1, upstream-adapters follow-up 1, and the two the round-2 queue named by mistake: observability's own follow-up 4 and async-operations follow-up 3), each verified against the current text of its source spec and of this one, then read adversarially against the rest of this spec. Applied, four of six. (1) supply-chain-policy follow-up 2 (its "The advisory feed and its freshness", AC9, AC16, the `policy.feed.sources` key row): the default feed's reserved name `osv` is the `source` value on both `policy_advisory_feed_*` rows, the `policy.feed.import` row's `source` (also the value when the route's parameter is absent), `policy.feed_sync:osv` in the schedule paragraph, the `async_schedule_*` row, AC5 and AC6, and AC5's `metrics_test.go` row names the per-source case with `osv`, as `async-operations.md` AC20's row does. (2) round-2 async-operations follow-up 2 (its "The scheduler", AC20 and its row, as applied at fc55b40): the fold is over enabled rows, a derived-next-run kind's period is `next_run_at - last_run_at` written at `Finish`, and a disabled row (deleted, `read_only`, offline) is not exported and takes no part, so the alert names a schedule that should have run; stated in "Cardinality", the catalogue row, the was-Q9 record and AC5, whose fixture now also asserts that disabling the overdue row stops the alert, with the disabled-row and derived-period cases on its `metrics_test.go` row. (3) format-handler-interface follow-up 1 (its "The pinned method set" and AC14, applied at cef6fe8): `format.HijackReporter` with `Hijacked(status int, size int64)` is now a citation, not a reported consequence; the reported size is the body's length, the measure the middleware records for a written response; the writer calls the first reporter on the `Unwrap` chain exactly once and tolerates a chain with none, so the guarantee that every chain holds one is this spec's (one middleware per listener plus AC30's compile-time assertion); the dependency row, AC30 and its row say so, and the row cites `internal/format/arch_test.go` for AC14's single non-test call-site assertion. (4) upstream-adapters follow-up 1 (its "Timeouts, concurrency and completion", "Request hygiene", AC31): `server_address` is also a realm host or a credential kind's fixed endpoint (the metadata server, the ECR endpoint), still operator configuration or a fixed provider endpoint, in "Cardinality" and the client histogram's row; the adversarial read added to the disclosure paragraph that such an endpoint can carry an account identity (an ECR registry host carries the AWS account id), one more reason the listener is never public. Declined: the item the round-2 queue called "signing-service follow-up 4" is this spec's own outbound consequence to `signing-service.md` (leader-exported, `_other` by maximum), already in this catalogue's `index_requested_cells` row since a27dea9 and still unapplied on that side, re-reported below; async-operations follow-up 3 (the `WithJob` citation) was applied at a27dea9 and re-verified against async AC27 and its Claim paragraph. Noted, not adopted: the round-2 async owner note that a never-run schedule has no `last_run`, so `ScheduleOverdue` sees a kind only after its first run; no criterion here depends on it and the fold's wording leaves it to `async-operations.md`. No question raised, none adopted; no pinned method, `Deps` interface, mark root or `auth.md` AC10 touched. No em-dashes or en-dashes. 31 criteria, each with a Test Plan row; nine questions resolved, zero open; `node scripts/check-spec.js` on this file: zero failures. Sibling consequences reported, not applied: `signing-service.md` (optional, still open from a27dea9: `index_requested_cells{repository}` is leader-exported and `_other` folds by maximum, on its "Observability" list), `supply-chain-policy.md` (optional wording: its AC16 or import paragraph may say the `policy.feed.import` record's `source` reads `osv` when the route's parameter is absent, as `management-api.md`'s follow-up item 1 asks of AC34). Stays planned. |
