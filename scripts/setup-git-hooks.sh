#!/bin/bash
# Copyright (c) 2025 VH & Co BV. Licensed under the Business Source License 1.1. See LICENSE for details.

# Setup script to install shared git hooks
# This configures git to use the .githooks directory for hooks

set -e

GIT_HOOKS_PATH=".githooks"
GIT_ROOT=$(git rev-parse --show-toplevel)

if [ ! -d "$GIT_ROOT/$GIT_HOOKS_PATH" ]; then
    echo "Error: $GIT_HOOKS_PATH directory not found in repository root"
    exit 1
fi

# Configure git to use the shared hooks directory
git config core.hooksPath "$GIT_HOOKS_PATH"

echo "✅ Git hooks configured successfully!"
echo "   Hooks directory: $GIT_ROOT/$GIT_HOOKS_PATH"
echo ""
echo "The pre-commit hook will now automatically run lint-fix on:"
echo "  - Backend files when backend/ directory is modified"
echo "  - Frontend files when frontend/ directory is modified"
echo ""
echo "The commit-msg hook rejects self-credit / AI attribution in commit messages"
echo "(Co-Authored-By: Claude/Anthropic, 'Generated with Claude Code', etc.)."
echo ""
echo "To uninstall, run: git config --unset core.hooksPath"

