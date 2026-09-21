#!/usr/bin/env node
/**
 * Docs staleness checker - compares changed files against docs-coverage.json
 * to flag documentation that may need updating.
 *
 * Usage:
 *   node scripts/check-doc-coverage.js [file1] [file2] ...
 *   git diff --name-only | node scripts/check-doc-coverage.js
 *
 * Exit codes:
 *   0 - no docs impacted (or coverage index not found)
 *   1 - docs may need updating (list printed to stdout)
 */
const fs = require('fs');
const path = require('path');

const COVERAGE_FILE = path.join(__dirname, '..', 'docs-coverage.json');

/**
 * Simple glob matcher - supports * (any segment chars) and ** (any path depth).
 * No external dependencies.
 */
function globMatch(pattern, filePath) {
  // Escape regex special chars except * and **
  let re = pattern
    .replace(/([.+?^${}()|[\]\\])/g, '\\$1')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  return new RegExp(`^${re}$`).test(filePath);
}

function main() {
  // Load coverage index
  if (!fs.existsSync(COVERAGE_FILE)) {
    // No coverage index yet - skip silently
    process.exit(0);
  }

  const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf-8'));

  // Get changed files from args or stdin
  let changedFiles = process.argv.slice(2);

  if (changedFiles.length === 0) {
    // Try reading from stdin (piped input)
    try {
      const stdin = fs.readFileSync(0, 'utf-8').trim();
      if (stdin) changedFiles = stdin.split('\n').map(f => f.trim()).filter(Boolean);
    } catch (e) {
      // No stdin
    }
  }

  if (changedFiles.length === 0) {
    process.exit(0);
  }

  // Filter out doc files themselves - changing a doc doesn't make other docs stale
  changedFiles = changedFiles.filter(f => !f.startsWith('docs/'));

  if (changedFiles.length === 0) {
    process.exit(0);
  }

  // Match changed files against coverage globs
  const impactedDocs = new Map(); // doc path -> set of triggering files

  for (const file of changedFiles) {
    for (const [glob, docs] of Object.entries(coverage)) {
      if (globMatch(glob, file)) {
        for (const doc of docs) {
          if (!impactedDocs.has(doc)) impactedDocs.set(doc, new Set());
          impactedDocs.get(doc).add(file);
        }
      }
    }
  }

  if (impactedDocs.size === 0) {
    process.exit(0);
  }

  // Group by changed file for readable output
  const byFile = new Map();
  for (const [doc, files] of impactedDocs) {
    for (const file of files) {
      if (!byFile.has(file)) byFile.set(file, []);
      byFile.get(file).push(doc);
    }
  }

  // Print warning
  console.log('\n⚠ Changed files match documented areas:\n');
  for (const [file, docs] of [...byFile.entries()].sort()) {
    console.log(`  ${file}`);
    for (const doc of docs.sort()) {
      console.log(`    → ${doc}`);
    }
    console.log('');
  }
  console.log('Review these docs for accuracy.\n');

  process.exit(1);
}

main();
