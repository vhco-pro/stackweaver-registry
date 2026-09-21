#!/usr/bin/env node
/**
 * Documentation index builder.
 *
 * This is the trimmed descendant of Stackweaver's builder. That one also rendered the docs
 * into a React viewer (Shiki highlighting, search index, image optimisation, code-explorer
 * directives); roughly a thousand of its lines existed to serve `frontend/public/`. This
 * project has no docs viewer yet, so only the load-bearing half is ported:
 *
 *   1. Parse frontmatter across `docs/**`.
 *   2. Validate it - a doc with no `description` is invisible to tooling, and a plan with a
 *      status outside the canonical vocabulary silently drops out of status reporting.
 *   3. Generate `docs-coverage.json` - the `covers` glob -> docs map that powers
 *      `scripts/check-doc-coverage.js` and the pre-commit doc-impact warning.
 *   4. Regenerate the `## Contents` table in every README under docs/ from its siblings'
 *      frontmatter, so those tables are never hand-edited and never drift.
 *
 * When a web viewer lands, extend this file rather than forking it - the drift between two
 * index builders is exactly the failure this consolidation exists to prevent.
 *
 * Usage:
 *   node scripts/build-docs-index.js          # build, fail on validation errors
 *   node scripts/build-docs-index.js --check  # validate only, write nothing
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOCS_ROOT = path.join(ROOT, 'docs');
const COVERAGE_FILE = path.join(ROOT, 'docs-coverage.json');
const INDEX_FILE = path.join(ROOT, 'docs-index.json');

const CHECK_ONLY = process.argv.includes('--check');

/** Canonical plan/spec status vocabulary. Anything else is a typo or an invention. */
const VALID_STATUS = ['draft', 'planned', 'in-progress', 'complete', 'blocked', 'parked'];

/** Code-area prefixes a `covers` glob may point at. Never `docs/` - docs do not cover docs. */
const COVERS_PREFIXES = ['cmd/', 'internal/', 'pkg/', 'conformance/', 'web/', 'deploy/', 'scripts/', '.github/'];

const errors = [];
const warnings = [];

// ── frontmatter ──────────────────────────────────────────────────────────────

/**
 * Minimal YAML frontmatter parser: scalars, inline `[a, b]`, and `- item` block lists.
 * Deliberately not a YAML dependency - the schema is fixed and tiny.
 */
function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return null;

  const body = raw.slice(3, end).replace(/^\n/, '');
  const out = {};
  let currentKey = null;

  for (const line of body.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentKey) {
      out[currentKey].push(unquote(listItem[1].trim()));
      continue;
    }

    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;

    const [, key, rawValue] = kv;
    const value = rawValue.trim();

    if (value === '') {
      out[key] = [];
      currentKey = key;
    } else if (value.startsWith('[')) {
      out[key] = value
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((s) => unquote(s.trim()))
        .filter(Boolean);
      currentKey = null;
    } else {
      out[key] = unquote(value);
      currentKey = null;
    }
  }
  return out;
}

function unquote(s) {
  return s.replace(/^["']|["']$/g, '');
}

// ── discovery ────────────────────────────────────────────────────────────────

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (entry.name.endsWith('.md')) {
      acc.push(full);
    }
  }
  return acc;
}

function collect() {
  if (!fs.existsSync(DOCS_ROOT)) return [];

  return walk(DOCS_ROOT).map((absPath) => {
    const relPath = path.relative(ROOT, absPath);
    const raw = fs.readFileSync(absPath, 'utf-8');
    const fm = parseFrontmatter(raw) || {};
    return {
      absPath,
      relPath,
      name: path.basename(absPath),
      isReadme: path.basename(absPath).toLowerCase() === 'readme.md',
      isPlan: relPath.startsWith(path.join('docs', 'internal', 'plans') + path.sep),
      internal: relPath.startsWith(path.join('docs', 'internal') + path.sep),
      fm,
    };
  });
}

// ── validation ───────────────────────────────────────────────────────────────

function validate(docs) {
  for (const doc of docs) {
    const { fm, relPath } = doc;

    if (!fm.description) {
      errors.push(`${relPath}: missing \`description\` - the doc is silently dropped from the index`);
    }

    if (doc.isPlan && !doc.isReadme) {
      for (const field of ['status', 'status_description', 'author', 'goal']) {
        if (!fm[field]) errors.push(`${relPath}: plan is missing \`${field}\``);
      }
      if (fm.status && !VALID_STATUS.includes(fm.status)) {
        errors.push(
          `${relPath}: status "${fm.status}" is outside the canonical vocabulary (${VALID_STATUS.join(', ')})`,
        );
      }
    }

    for (const glob of fm.covers || []) {
      if (glob.startsWith('docs/')) {
        errors.push(`${relPath}: \`covers\` entry "${glob}" points at docs/ - covers lists code areas only`);
        continue;
      }
      if (!COVERS_PREFIXES.some((p) => glob.startsWith(p))) {
        warnings.push(`${relPath}: \`covers\` entry "${glob}" matches no known code area`);
      }
    }
  }
}

// ── coverage index ───────────────────────────────────────────────────────────

function buildCoverage(docs) {
  const coverage = {};
  for (const doc of docs) {
    for (const glob of doc.fm.covers || []) {
      if (glob.startsWith('docs/')) continue;
      (coverage[glob] ||= []).push(doc.relPath);
    }
  }
  for (const glob of Object.keys(coverage)) coverage[glob].sort();
  return Object.fromEntries(Object.entries(coverage).sort(([a], [b]) => a.localeCompare(b)));
}

// ── README Contents tables ───────────────────────────────────────────────────

/**
 * Rewrite the `## Contents` section of each README from its siblings' frontmatter.
 * Hand-editing these tables is banned precisely because this function owns them.
 */
function renderContents(docs) {
  const byDir = new Map();
  for (const doc of docs) {
    const dir = path.dirname(doc.absPath);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(doc);
  }

  let rewritten = 0;

  for (const readme of docs.filter((d) => d.isReadme)) {
    const dir = path.dirname(readme.absPath);
    const rows = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory()) {
        const childReadme = path.join(dir, entry.name, 'README.md');
        const desc = fs.existsSync(childReadme)
          ? (parseFrontmatter(fs.readFileSync(childReadme, 'utf-8')) || {}).description || ''
          : '';
        rows.push([`[${entry.name}/](./${entry.name}/)`, desc]);
      } else if (entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md') {
        const sibling = (byDir.get(dir) || []).find((d) => d.name === entry.name);
        rows.push([`[${entry.name}](./${entry.name})`, sibling?.fm.description || '']);
      }
    }

    if (rows.length === 0) continue;

    const table = [
      '| Name | Description |',
      '|------|-------------|',
      ...rows.map(([link, desc]) => `| ${link} | ${desc} |`),
    ].join('\n');

    const raw = fs.readFileSync(readme.absPath, 'utf-8');
    const replacement = `## Contents\n\n${table}\n`;

    // Span from the `## Contents` heading to the next `## ` heading (or EOF). Done with
    // string indexes rather than a regex: the multiline-anchored version of this is subtly
    // wrong at EOF, and a table builder that eats the rest of the file is a bad day.
    const start = raw.search(/^## Contents[ \t]*$/m);
    let next;
    if (start === -1) {
      next = `${raw.trimEnd()}\n\n${replacement}`;
    } else {
      const after = raw.slice(start);
      const nextHeadingOffset = after.search(/\n## /);
      const end = nextHeadingOffset === -1 ? raw.length : start + nextHeadingOffset + 1;
      next = raw.slice(0, start) + replacement + (end < raw.length ? `\n${raw.slice(end)}` : '');
    }

    if (next !== raw) {
      if (!CHECK_ONLY) fs.writeFileSync(readme.absPath, next);
      rewritten++;
    }
  }

  return rewritten;
}

// ── main ─────────────────────────────────────────────────────────────────────

function main() {
  const docs = collect();
  if (docs.length === 0) {
    console.log('No docs found under docs/ - nothing to index.');
    return;
  }

  validate(docs);

  const coverage = buildCoverage(docs);
  const index = docs
    .filter((d) => !d.isReadme)
    .map((d) => ({
      path: d.relPath,
      description: d.fm.description || '',
      internal: d.internal,
      ...(d.fm.status ? { status: d.fm.status } : {}),
      ...(d.fm.issue ? { issue: d.fm.issue } : {}),
      covers: d.fm.covers || [],
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const rewritten = renderContents(docs);

  if (!CHECK_ONLY) {
    fs.writeFileSync(COVERAGE_FILE, `${JSON.stringify(coverage, null, 2)}\n`);
    fs.writeFileSync(INDEX_FILE, `${JSON.stringify(index, null, 2)}\n`);
  }

  for (const w of warnings) console.warn(`\x1b[33m⚠ ${w}\x1b[0m`);
  for (const e of errors) console.error(`\x1b[31m✖ ${e}\x1b[0m`);

  console.log(
    `${CHECK_ONLY ? 'Checked' : 'Indexed'} ${docs.length} docs · ` +
      `${Object.keys(coverage).length} covers globs · ${rewritten} README table(s) ${CHECK_ONLY ? 'stale' : 'rebuilt'}`,
  );

  if (errors.length > 0) {
    console.error(`\n${errors.length} frontmatter error(s). Fix them - CI runs this with --check.`);
    process.exit(1);
  }
}

main();
