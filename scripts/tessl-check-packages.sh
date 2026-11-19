#!/usr/bin/env bash
# Packs every skill in tessl/skills.json the way the publish workflow does
# and fails unless the archive holds exactly the skill's files, under
# skills/<skill>/, plus the manifest and the tile.json Tessl generates. Catches packaging mistakes before a
# merge publishes them (RCA 1.6.0 went out without references/).
#
# Needs the tessl CLI; no login. Usage: scripts/tessl-check-packages.sh

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

status=0
for skill in $(node "$root/scripts/tessl-stage.mjs" --list | jq -r '.[]'); do
  node "$root/scripts/tessl-stage.mjs" "$skill" "$work/$skill" > /dev/null
  (cd "$work/$skill" && tessl plugin pack --output "$work/$skill.tgz" > /dev/null)

  expected="$(cd "$root/plugins/kopai/skills/$skill" && find . -type f | sed "s|^\./|skills/$skill/|" | sort)"
  expected="$(printf '%s\n%s\n%s\n' ".tessl-plugin/plugin.json" "tile.json" "$expected" | sort)"
  actual="$(tar -tzf "$work/$skill.tgz" | grep -v '/$' | sort)"

  if [ "$expected" = "$actual" ]; then
    echo "✔ kopai/$skill packs all $(echo "$actual" | wc -l | tr -d ' ') files"
  else
    echo "✘ kopai/$skill: the archive differs from the skill folder (- expected, + packed):"
    diff <(echo "$expected") <(echo "$actual") | grep -E '^[<>]' | sed 's/^</-/; s/^>/+/' || true
    status=1
  fi
done
exit "$status"
