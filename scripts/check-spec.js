#!/usr/bin/env node
/**
 * Mechanical spec gate checker.
 *
 * Every check here was, until now, being performed by a language model during `/spec review`.
 * None of them requires judgement, so none of them should cost tokens. What remains for a
 * reviewer after this script passes is the part that genuinely needs a mind: is the design
 * right, does it contradict a sibling, what did it miss.
 *
 * Run it before and after every review pass, and before flipping a spec to `planned`.
 *
 * Usage:
 *   node scripts/check-spec.js                    # all specs
 *   node scripts/check-spec.js <path> [...]       # named specs
 *   node scripts/check-spec.js --gate <path>      # gate mode: exit 1 unless `planned` is earned
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PLANS = path.join(ROOT, 'docs', 'internal', 'plans');
const VALID_STATUS = ['draft', 'planned', 'in-progress', 'complete', 'blocked', 'parked'];

const args = process.argv.slice(2);
const gateMode = args.includes('--gate');
const showSoft = args.includes('--unasserted');
const targets = args.filter((a) => !a.startsWith('--'));

let hardFailures = 0;
let advisories = 0;
const crossRefs = [];

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

function fail(file, msg) {
  console.error(`${red('✖')} ${file}: ${msg}`);
  hardFailures++;
}
function warn(file, msg) {
  console.warn(`${yellow('⚠')} ${file}: ${msg}`);
  advisories++;
}

function collect() {
  if (targets.length) return targets.map((t) => path.resolve(t));
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.md') && e.name.toLowerCase() !== 'readme.md') out.push(full);
    }
  })(PLANS);
  return out;
}

function section(body, heading) {
  const start = body.search(new RegExp(`^## ${heading}[ \\t]*$`, 'm'));
  if (start === -1) return null;
  const after = body.slice(start);
  const next = after.slice(1).search(/^## /m);
  return next === -1 ? after : after.slice(0, next + 1);
}

function checkSpec(absPath) {
  const rel = path.relative(ROOT, absPath);
  const raw = fs.readFileSync(absPath, 'utf-8');

  // ── frontmatter ────────────────────────────────────────────────────────────
  const fmEnd = raw.indexOf('\n---', 3);
  if (!raw.startsWith('---') || fmEnd === -1) {
    fail(rel, 'no frontmatter block');
    return;
  }
  const fm = raw.slice(3, fmEnd);
  const body = raw.slice(fmEnd + 4);

  const get = (k) => {
    const m = fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
  };

  const status = get('status');

  // Not every plan-shaped document is a spec. A tracking document (no acceptance criteria,
  // no review gate) is exempt from the spec checks but still needs valid frontmatter.
  if (!section(body, 'Acceptance Criteria')) {
    if (!get('description')) fail(rel, 'frontmatter missing `description`');
    return { rel, status, acs: 0, open: 0, resolved: 0, lastSha: null, tracking: true };
  }

  for (const field of ['status', 'status_description', 'description', 'author', 'goal']) {
    if (!get(field)) fail(rel, `frontmatter missing \`${field}\``);
  }
  if (status && !VALID_STATUS.includes(status)) {
    fail(rel, `status "${status}" outside the vocabulary (${VALID_STATUS.join(', ')})`);
  }

  // ── acceptance criteria <-> test plan ──────────────────────────────────────
  const acs = [...body.matchAll(/^- \[[ x]\] (AC\d+):/gm)].map((m) => m[1]);
  const rows = [...body.matchAll(/^\| (AC\d+) \|/gm)].map((m) => m[1]);
  const acSet = new Set(acs);
  const rowSet = new Set(rows);

  if (acs.length === 0) fail(rel, 'no acceptance criteria');
  for (const ac of acSet) if (!rowSet.has(ac)) fail(rel, `${ac} has no Test Plan row`);
  for (const r of rowSet) if (!acSet.has(r)) fail(rel, `Test Plan row ${r} has no matching criterion`);

  const dupes = acs.filter((a, i) => acs.indexOf(a) !== i);
  if (dupes.length) fail(rel, `duplicate criterion ids: ${[...new Set(dupes)].join(', ')}`);

  // ── open questions, and stale references to resolved ones ──────────────────
  const oq = section(body, 'Open Questions') || '';
  const openQs = [...oq.matchAll(/^### (Q\d+):/gm)].map((m) => m[1]);
  const resolved = [...body.matchAll(/^### Resolved:.*?\(was (Q\d+)/gm)].map((m) => m[1]);
  const openSet = new Set(openQs);

  // A body reference to a question that is NOT open is the half-applied-decision defect:
  // the decision was recorded and the prose still points at it as undecided.
  const bodyBeforeQuestions = body.split(/^## Open Questions/m)[0];
  const refs = [...bodyBeforeQuestions.matchAll(/\bis (Q\d+)\b|\((Q\d+)\)|\b(Q\d+) (?:below|above)\b/g)];
  for (const m of refs) {
    const q = m[1] || m[2] || m[3];
    if (!openSet.has(q)) {
      fail(rel, `body references ${q} as if open, but it is resolved or absent (half-applied decision)`);
    }
  }

  // ── template sections /implement gates on ──────────────────────────────────
  for (const h of ['Acceptance Criteria', 'Test Plan', 'Open Questions', 'Review Log']) {
    if (!section(body, h)) fail(rel, `missing \`## ${h}\` section`);
  }
  if (!section(body, 'Tasks')) warn(rel, 'no `## Tasks` section (/implement gates on it)');

  // A spec with criteria but nothing but boilerplate behind them is a stub wearing a spec's
  // frontmatter. npm.md reached a first review in that state, its resolved decision claiming to
  // have been folded "into Design and Scope above" when no Design section existed at all.
  // The test is substance, not a heading name: a spec may carry its design under its own
  // headings (catalogue.md does), but a spec whose every section is template scaffolding has
  // criteria with nothing behind them.
  const TEMPLATE_HEADINGS = new Set([
    'Context', 'Scope', 'Design', 'Acceptance Criteria', 'Test Plan',
    'Implementation Phases', 'Tasks', 'Open Questions', 'Review Log',
  ]);
  const headings = [...body.matchAll(/^## (.+?)[ \t]*$/gm)].map((m) => m[1].trim());
  const ownHeadings = headings.filter((h) => !TEMPLATE_HEADINGS.has(h));
  if (!section(body, 'Design') && ownHeadings.length === 0) {
    fail(rel, 'has acceptance criteria but no `## Design` section and no substantive sections of its own: a stub, not a spec');
  }
  if (!section(body, 'Implementation Phases')) warn(rel, 'no `## Implementation Phases` section');

  // ── review log freshness ───────────────────────────────────────────────────
  const log = section(body, 'Review Log') || '';
  const logRows = [...log.matchAll(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([0-9a-f]{7,40})\s*\|/gm)];
  const lastSha = logRows.length ? logRows[logRows.length - 1][2] : null;

  if (status === 'planned') {
    if (openQs.length) fail(rel, `status is planned but ${openQs.length} question(s) are open`);
    // Uncommitted edits are invisible to a commit-range diff, so check the working tree too.
    // Without this, editing a planned spec and running the checker before committing passes.
    //
    // But the review that FLIPS a spec to planned is itself uncommitted when it finishes, so a
    // flat failure here is unsatisfiable: the only way to clear it is to commit, and the
    // pre-commit hook runs this check. The discriminator is whether the uncommitted diff adds a
    // Review Log row. If it does, this is a review in progress and the status is its conclusion.
    // If it does not, a planned spec is being edited with no new review, which is the drift the
    // guard exists to catch.
    try {
      const dirty = execSync(`git -C ${ROOT} status --porcelain -- "${rel}"`, { encoding: 'utf-8' }).trim();
      if (dirty) {
        const diff = execSync(`git -C ${ROOT} diff HEAD -- "${rel}"`, { encoding: 'utf-8' });
        const addsReview = /^\+\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*[0-9a-f]{7,40}\s*\|/m.test(diff);
        if (addsReview) {
          warn(rel, 'planned by an uncommitted review; commit it so the freshness check has a sha to measure from');
        } else {
          fail(rel, 'status is planned but the spec has uncommitted changes that add no review row; re-review required');
        }
      }
    } catch { /* not a git tree */ }
    if (!lastSha) fail(rel, 'status is planned with no Review Log entry');
    else {
      // A review verifies against sha X, then writes its own edits, which land in a later
      // commit. So freshness is measured from the commit that RECORDED the review, not from
      // the sha the row cites - otherwise every review marks its own spec stale.
      try {
        const recording = execSync(
          `git -C ${ROOT} log -1 --format=%H -S"${lastSha}" -- "${rel}"`,
          { encoding: 'utf-8' },
        ).trim();
        if (!recording) {
          warn(rel, `Review Log cites ${lastSha} but no commit records it; unpushed review?`);
        } else {
          const changed = execSync(
            `git -C ${ROOT} diff --name-only ${recording}..HEAD -- "${rel}"`,
            { encoding: 'utf-8' },
          ).trim();
          if (changed) {
            fail(rel, `status is planned but the spec changed after its review landed; re-review required`);
          }
        }
      } catch {
        warn(rel, `could not verify review freshness against ${lastSha}`);
      }
    }
  }

  // ── cross-spec references ──────────────────────────────────────────────────
  // Every finding in the 2026-09-23 consistency pass was the same shape: a spec citing a
  // sibling's AC<n> or Q<n> that had since been renumbered, resolved, or never existed. That
  // is checkable, so it should not cost a review pass.
  crossRefs.push({ rel, body });

  // ── criteria that measure the problem instead of removing it ───────────────
  // Heuristic, advisory: a criterion whose subject is a report/count/warning is satisfiable
  // while the problem it describes remains entirely intact.
  for (const m of body.matchAll(/^- \[[ x]\] (AC\d+): (.+)$/gm)) {
    if (/\b(reports?|records?|logs?|counts?|warns?|tracks?|surfaces?)\b/i.test(m[2]) &&
        !/\b(and|so that|with|proven|asserted|verified)\b/i.test(m[2])) {
      warn(rel, `${m[1]} may measure the problem rather than state an end state: "${m[2].slice(0, 70)}..."`);
    }
  }

  // ── duties Design names that no criterion polices ──────────────────────────
  // Five consecutive gate reviews found the same defect by hand: Design names a term as a duty,
  // a mechanism or a mode, and no acceptance criterion ever mentions it, so it can be silently
  // unimplemented. Backticked terms are the tractable signal - a spec backticks what it means
  // technically. Reported only when NO spec in the tree asserts the term, since a term this
  // spec names and a sibling polices is a division of labour rather than a gap. `--unasserted`
  // also shows the weaker per-spec bucket.
  const designText = (section(body, 'Design') || '') + (section(body, 'Scope') || '');
  const assertions = ((section(body, 'Acceptance Criteria') || '') +
                      (section(body, 'Test Plan') || '')).toLowerCase();
  if (designText && assertions) {
    // Paths, filenames and notations like `(repository, action)` are citations, not duties.
    const NOT_A_DUTY = /[/]|^\(|\.(md|go|js|json|ya?ml|sh)$/;
    const normTerm = (t) => t.replace(/\(\)$/, '').toLowerCase();
    const seen = new Map();
    for (const m of designText.matchAll(/`([^`\n]{3,40})`/g)) {
      const term = m[1].trim();
      if (NOT_A_DUTY.test(term)) continue;
      const key = normTerm(term);
      if (!seen.has(key)) seen.set(key, { term, count: 0 });
      seen.get(key).count++;
    }
    for (const { term, count } of seen.values()) {
      const key = normTerm(term);
      if (count < 2 || assertions.includes(key)) continue;
      if (!ALL_ASSERTIONS.includes(key)) {
        warn(rel, `Design names \`${term}\` ${count} times and no criterion in any spec asserts it`);
      } else if (showSoft) {
        warn(rel, `Design names \`${term}\` ${count} times; only a sibling spec asserts it`);
      }
    }
  }

  // ── house style ────────────────────────────────────────────────────────────
  const dashLines = body.split('\n')
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => /[—–]/.test(l));
  for (const [n] of dashLines) fail(rel, `em-dash or en-dash on line ${n} (house rule)`);

  // A spec with no questions, no resolved decisions and no review has not been settled: it has
  // never been interrogated. Zero-open is the gate's main signal, so without this the two states
  // are indistinguishable and an unexamined spec scores like one that survived four rounds.
  // Only actual reviews count. The repository already labels the others: a cross-spec sync or a
  // terminated partial pass says so in its lens or opens its outcome with "Not a review", and
  // such a row leaves the design just as uninterrogated as no row at all.
  const reviewRows = (section(body, 'Review Log') || '').split('\n')
    .filter((l) => /^\| \d{4}-\d{2}-\d{2} \|/.test(l))
    .filter((l) => {
      const cells = l.split('|').map((c) => c.trim());
      const lens = cells[3] || '';
      const outcome = cells[4] || '';
      return !/^(cross-spec|partial)\b/i.test(lens) && !/^not a review\b/i.test(outcome);
    }).length;
  const unexamined = openQs.length === 0 && resolved.length === 0 && reviewRows === 0;
  if (unexamined) {
    warn(rel, 'never interrogated: no open questions, no resolved decisions, no review. Zero open is not the same as settled.');
  }

  return { rel, status, acs: acs.length, open: openQs.length, resolved: resolved.length, lastSha, unexamined };
}

// Every spec's assertions, so a term this spec names but a sibling polices is not reported as a
// defect. Built from the full tree rather than from the run's targets, or a single-file run would
// call every sibling-asserted term unasserted.
const ALL_ASSERTIONS = (function () {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.md') && e.name.toLowerCase() !== 'readme.md') {
        const b = fs.readFileSync(full, 'utf8');
        out.push((section(b, 'Acceptance Criteria') || '') + (section(b, 'Test Plan') || ''));
      }
    }
  })(PLANS);
  return out.join('\n').toLowerCase();
})();

const specs = collect().map(checkSpec).filter(Boolean);

// ── cross-spec reference integrity ───────────────────────────────────────────
// Build an index of what every spec actually offers, then verify each citation against it.
const offered = new Map(); // basename -> { acs:Set, openQs:Set, resolvedQs:Set }
// Always index every spec, not just the targets: running against one file must still be able
// to verify its citations of siblings, or a single-file run reports every sibling as missing.
const allSpecFiles = [];
(function walkAll(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkAll(full);
    else if (e.name.endsWith('.md') && e.name.toLowerCase() !== 'readme.md') allSpecFiles.push(full);
  }
})(PLANS);
for (const f of allSpecFiles) {
  const raw = fs.readFileSync(f, 'utf-8');
  const fmEnd = raw.indexOf('\n---', 3);
  const b = fmEnd === -1 ? raw : raw.slice(fmEnd + 4);
  const oq = section(b, 'Open Questions') || '';
  offered.set(path.basename(f), {
    acs: new Set([...b.matchAll(/^- \[[ x]\] (AC\d+):/gm)].map((m) => m[1])),
    openQs: new Set([...oq.matchAll(/^### (Q\d+):/gm)].map((m) => m[1])),
    resolvedQs: new Set([...b.matchAll(/^### Resolved:.*?\(was (Q\d+)/gm)].map((m) => m[1])),
  });
}

for (const { rel, body } of crossRefs) {
  const self = path.basename(rel);
  // "`conformance-harness.md` AC11", "formats/generic.md Q7", "`oci.md`'s AC1"
  const HISTORICAL = /\b(resolved|resolves|settled|settles|was its|was|answer to|answered|per)\b/i;
  for (const m of body.matchAll(/([a-z0-9-]+\.md)`?(?:'s)?([^.\n]{0,40}?)\b(AC\d+|Q\d+)\b/gi)) {
    const [, file, between, ref] = m;
    if (file === self) continue;
    // Citing a question by its historical number is legitimate - that is how Resolved
    // sections are labelled ("was Q2"). Only flag citations presenting it as still open.
    // The qualifier can sit either side of the filename, so both windows are checked.
    const before = body.slice(Math.max(0, m.index - 70), m.index);
    if (HISTORICAL.test(between) || HISTORICAL.test(before)) continue;
    const target = offered.get(file);
    if (!target) { warn(rel, `cites ${file}, which is not a spec in this repository`); continue; }
    if (ref.startsWith('AC')) {
      if (!target.acs.has(ref)) fail(rel, `cites ${file} ${ref}, which does not exist there`);
    } else if (!target.openQs.has(ref)) {
      const why = target.resolvedQs.has(ref) ? 'resolved there' : 'absent there';
      fail(rel, `cites ${file} ${ref} as open, but it is ${why}`);
    }
  }
}

console.log('\n' + 'SPEC'.padEnd(46) + 'STATUS'.padEnd(12) + 'ACs'.padEnd(6) + 'OPEN'.padEnd(6) + 'RESOLVED');
console.log('-'.repeat(84));
for (const s of specs.filter((s) => !s.tracking).sort((a, b) => a.rel.localeCompare(b.rel))) {
  const name = s.rel.replace('docs/internal/plans/', '');
  console.log(
    name.padEnd(46) + String(s.status).padEnd(12) + String(s.acs).padEnd(6) +
    String(s.open).padEnd(6) + String(s.resolved),
  );
}
console.log('-'.repeat(84));
console.log(
  `${specs.filter((s) => !s.tracking).length} specs · ${specs.filter((s) => s.status === 'planned').length} planned · ` +
  `${specs.reduce((n, s) => n + s.open, 0)} open questions`,
);

if (gateMode) {
  const t = specs[0];
  if (!t) { console.error('gate mode needs exactly one spec path'); process.exit(2); }
  const blockers = [];
  if (t.open > 0) blockers.push(`${t.open} open question(s)`);
  if (t.unexamined) blockers.push('never interrogated (no questions, no decisions, no review)');
  if (hardFailures > 0) blockers.push(`${hardFailures} mechanical failure(s)`);
  console.log('');
  if (blockers.length) {
    console.log(red(`GATE: not earned - ${blockers.join(', ')}`));
    process.exit(1);
  }
  console.log(green('GATE: mechanically clear. A review still has to judge the design.'));
  process.exit(0);
}

console.log('');
if (hardFailures) {
  console.error(red(`${hardFailures} failure(s), ${advisories} advisory.`));
  process.exit(1);
}
console.log(green(`No mechanical failures. ${advisories} advisory.`));
