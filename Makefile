.DEFAULT_GOAL := help
.PHONY: help setup setup-git-hooks build run test verify lint lint-fix vuln conformance conformance-format docs docs-check clean

GO ?= go
BIN_DIR := bin

## help: list targets
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## //' | awk -F': ' '{printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2}'

## setup: install Go dependencies and the dev toolchain
setup:
	$(GO) mod download
	$(GO) install mvdan.cc/gofumpt@latest
	@echo "golangci-lint: install the version pinned in .github/workflows/ci.yml"
	@echo "  go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@<pinned>"

## setup-git-hooks: install the pre-commit and commit-msg hooks
setup-git-hooks:
	@bash scripts/setup-git-hooks.sh

## build: build all binaries into bin/
build:
	$(GO) build -o $(BIN_DIR)/ ./cmd/...

## run: run the server locally
run:
	$(GO) run ./cmd/stackweaver-registry serve

## test: run Go unit tests
test:
	$(GO) test ./...

## verify: run the CI suite locally, read-only, before pushing
verify:
	@FAST=$(FAST) SUITES="$(SUITES)" bash scripts/verify-local.sh

## lint: run linters with auto-fix (NOTE: this fixes; `verify` checks the way CI checks)
lint:
	gofumpt -w .
	golangci-lint run --fix ./...

## vuln: run govulncheck
vuln:
	govulncheck ./...

## conformance: run the full conformance suite (real clients, real containers)
conformance:
	$(GO) test -tags=conformance -timeout=30m ./conformance/...

## conformance-format: run one format's conformance suite, e.g. FORMAT=oci
conformance-format:
	@test -n "$(FORMAT)" || (echo "usage: make conformance-format FORMAT=oci" && exit 1)
	$(GO) test -tags=conformance -timeout=30m -run 'TestConformance/$(FORMAT)' ./conformance/...

## docs: rebuild the docs index, coverage map and README contents tables
docs:
	@node scripts/build-docs-index.js

## docs-check: validate docs frontmatter without writing (what CI runs)
docs-check:
	@node scripts/build-docs-index.js --check

## clean: remove build artifacts
clean:
	rm -rf $(BIN_DIR)
