#!/usr/bin/env bash
# Runs the eval cases in evals/kopai/ against plugins/kopai/.
#
# WHY the copy: `claude plugin eval --eval-dir` only accepts a directory
# inside the plugin, and the cases must not ship to users. So they live at
# the repo root, and this script copies them into the plugin for the run
# (one folder per run, so runs can overlap), moves the results back to
# evals/kopai/results/ and removes the copy.
#
# Paths you pass (--json, --report, --output-dir) are relative to where you
# run the script. Mock recordings that a run tells you to adopt go into
# evals/kopai/mocks/.replay/, not into the eval-run-* path it prints.
#
# Usage: scripts/eval.sh [claude plugin eval options]
#   e.g. scripts/eval.sh --runs 1 --ablation none --judge-model sonnet
# CLAUDE_CODE_VERSION overrides the pinned Claude Code version.

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
plugin="$root/plugins/kopai"
cases="$root/evals/kopai"
copy_name="eval-run-$$"
copy="$plugin/$copy_name"
version="${CLAUDE_CODE_VERSION:-2.1.322}"

cleanup() {
  if [ -d "$copy/results" ]; then
    mkdir -p "$cases/results"
    cp -R "$copy/results/." "$cases/results/"
  fi
  rm -rf "$copy"
}
trap cleanup EXIT

cp -R "$cases" "$copy"
rm -rf "$copy/results"

npx --yes "@anthropic-ai/claude-code@$version" plugin eval "$plugin" --eval-dir "$copy_name" "$@"
