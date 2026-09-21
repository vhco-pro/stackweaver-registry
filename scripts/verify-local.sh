#!/usr/bin/env bash
# Run the CI suite locally, read-only, before pushing.
#
# This is the same set of checks `.github/workflows/ci.yml` runs, in the same order, with the
# same tools. Two rules it exists to enforce, both learned the hard way upstream:
#
#   1. `make lint` AUTO-FIXES; this script does not. Passing lint locally while CI fails is
#      what happens when you fix files and forget to stage them.
#   2. Lint the whole module, never just the packages you touched. CI does, and a formatter
#      violation in an untouched file is still a red build.
#
# Usage:
#   scripts/verify-local.sh                 # everything
#   scripts/verify-local.sh --staged        # only suites affected by staged files (pre-commit)
#   SUITES="go docs" scripts/verify-local.sh
#   FAST=1 scripts/verify-local.sh          # skip govulncheck (~1 min)
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
FAILED=0
FAST="${FAST:-0}"

run() {
    local label="$1"; shift
    echo -e "\n${BLUE}── ${label} ─────────────────────────────${NC}"
    if "$@"; then
        echo -e "${GREEN}✔ ${label}${NC}"
    else
        echo -e "${RED}✖ ${label}${NC}"
        FAILED=1
    fi
}

skip() { echo -e "${YELLOW}⊘ $1 (SKIPPED - $2)${NC}"; }

# ── which suites ─────────────────────────────────────────────────────────────
ALL_SUITES="go docs"

if [ "${1:-}" = "--staged" ] || [ "${SUITES:-}" = "--staged" ]; then
    CHANGED=$(git diff --cached --name-only --diff-filter=ACMR)
    SUITES=""
    echo "$CHANGED" | grep -qE '\.go$|^go\.(mod|sum)$' && SUITES="$SUITES go"
    echo "$CHANGED" | grep -qE '^docs/|^scripts/.*\.js$' && SUITES="$SUITES docs"
    SUITES="${SUITES# }"
    if [ -z "$SUITES" ]; then
        echo "No code suites affected by staged changes - nothing to verify."
        exit 0
    fi
else
    SUITES="${SUITES:-$ALL_SUITES}"
fi

echo -e "${BLUE}Verifying suites:${NC} $SUITES"

# ── go ───────────────────────────────────────────────────────────────────────
if [[ " $SUITES " == *" go "* ]]; then
    # gofumpt is called directly, not only through golangci-lint: only recent golangci
    # releases enforce the gofumpt formatter, so the direct call is what makes the check
    # version-proof. A missing binary reports SKIPPED rather than passing silently.
    if command -v gofumpt >/dev/null 2>&1; then
        run "gofumpt (formatting)" bash -c '
            out=$(gofumpt -l . 2>&1)
            if [ -n "$out" ]; then echo "Unformatted files:"; echo "$out"; exit 1; fi'
    else
        skip "gofumpt" "not installed - go install mvdan.cc/gofumpt@latest"
    fi

    if command -v golangci-lint >/dev/null 2>&1; then
        # Version drift between local and CI produces different verdicts on identical code.
        PINNED=$(grep -oP 'version:\s*\Kv[0-9.]+' .github/workflows/ci.yml 2>/dev/null | head -1)
        LOCAL=$(golangci-lint version 2>/dev/null | grep -oP 'v?[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        if [ -n "$PINNED" ] && [ -n "$LOCAL" ] && [ "v${LOCAL#v}" != "v${PINNED#v}" ]; then
            echo -e "${YELLOW}⚠ golangci-lint local ${LOCAL} != CI pin ${PINNED} - same config, different verdict.${NC}"
        fi
        run "golangci-lint (whole module)" golangci-lint run ./...
    else
        skip "golangci-lint" "not installed"
    fi

    run "go build" go build ./...
    run "go test" go test ./...

    if [ "$FAST" = "1" ]; then
        skip "govulncheck" "FAST=1"
    elif command -v govulncheck >/dev/null 2>&1; then
        run "govulncheck" govulncheck ./...
    else
        skip "govulncheck" "not installed"
    fi
fi

# ── docs ─────────────────────────────────────────────────────────────────────
if [[ " $SUITES " == *" docs "* ]]; then
    if command -v node >/dev/null 2>&1; then
        run "docs frontmatter + index" node scripts/build-docs-index.js --check
    else
        skip "docs index" "node not installed"
    fi
fi

# ── result ───────────────────────────────────────────────────────────────────
echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed.${NC}"
    echo -e "${YELLOW}Note: this does not run the conformance suite. Run 'make conformance' for${NC}"
    echo -e "${YELLOW}anything touching a format handler, storage, or the proxy cache.${NC}"
else
    echo -e "${RED}Verification failed - these would fail in CI too.${NC}"
    echo -e "${YELLOW}Auto-fixable formatting and lint: run 'make lint', then re-stage.${NC}"
fi
exit $FAILED
