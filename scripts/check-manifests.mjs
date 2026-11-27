#!/usr/bin/env node
// Checks versions before a merge, because every merge to main is a release:
//
// - every manifest of a plugin (Claude's, Grok's, and OpenAI's once it exists) gives
//   the same name and version;
// - every skill Tessl publishes (tessl/skills.json) has a metadata.version;
// - the root LICENSE and each on-call skill's LICENSE.txt match the plugin's
//   LICENSE (Apache-2.0 says recipients get the license text, and the skills
//   CLI installs single skill folders, so the on-call skills adapted from
//   Anthropic's On-Call Kit each carry their own copy);
// - with --base, a plugin whose files changed since that git ref has a
//   higher version than at the base, and so does every changed skill that
//   declares a metadata.version (Tessl skips versions it already has).
//
// Usage:
//   node scripts/check-manifests.mjs                     agreement only
//   node scripts/check-manifests.mjs --base origin/main  agreement + bumps

import { execFileSync } from "node:child_process";
import console from "node:console";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseFrontmatter } from "./lib/skill-frontmatter.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Manifest locations inside a plugin folder, one per platform. */
const MANIFESTS = [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".grok-plugin/plugin.json",
];

const VERSION = /^\d+\.\d+\.\d+$/;

const { values: args } = parseArgs({
  options: {
    base: { type: "string" },
  },
});

function git(...argv) {
  return execFileSync("git", argv, { cwd: ROOT, encoding: "utf8" });
}

/** Lists the directories (not files such as .DS_Store) in a directory. */
function subdirs(dir) {
  return readdirSync(join(ROOT, dir), { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => `${dir}/${e.name}`);
}

function readText(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

/** Compares two x.y.z versions; returns <0, 0 or >0. */
function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/** A file's text at the base ref, or undefined if it didn't exist there. */
function atBase(path) {
  try {
    return git("show", `${args.base}:${path}`);
  } catch {
    return undefined;
  }
}

/** Requires `version` to be higher than `baseVersion` when `path` changed. */
function checkBump(problems, path, label, version, baseVersion) {
  if (!VERSION.test(baseVersion ?? "")) return; // New, or nothing to compare.
  const changed = git("diff", "--name-only", `${args.base}...HEAD`, "--", path)
    .split("\n")
    .filter(Boolean);
  if (changed.length === 0) return;
  if (compareVersions(version, baseVersion) <= 0) {
    problems.push(
      `${path}: ${changed.length} file(s) changed but ${label} is still ${version} (base ${baseVersion}); bump it`
    );
  }
}

const problems = [];

for (const dir of subdirs("plugins")) {
  const manifests = MANIFESTS.map((m) => `${dir}/${m}`).filter((m) =>
    existsSync(join(ROOT, m))
  );
  if (manifests.length === 0) {
    problems.push(`${dir}: no manifest`);
    continue;
  }

  const read = manifests.map((m) => ({ path: m, ...JSON.parse(readText(m)) }));
  const [first] = read;
  for (const field of ["name", "version"]) {
    for (const m of read.slice(1)) {
      if (m[field] !== first[field]) {
        problems.push(
          `${dir}: ${field} differs: ${first.path} has "${first[field]}", ${m.path} has "${m[field]}"`
        );
      }
    }
  }
  if (!VERSION.test(first.version ?? "")) {
    problems.push(`${first.path}: version "${first.version}" is not x.y.z`);
    continue;
  }

  if (args.base) {
    const base = atBase(first.path);
    const baseVersion = base && JSON.parse(base).version;
    checkBump(problems, dir, "the plugin version", first.version, baseVersion);
  }

  // Skills that declare metadata.version, in any of the plugin's folders.
  for (const folder of subdirs(dir)) {
    for (const skill of subdirs(folder)) {
      const path = `${skill}/SKILL.md`;
      if (!existsSync(join(ROOT, path))) continue;
      const { version } = parseFrontmatter(readText(path));
      if (version === undefined) continue;
      if (!VERSION.test(version)) {
        problems.push(`${path}: metadata.version "${version}" is not x.y.z`);
        continue;
      }
      if (args.base) {
        const base = atBase(path);
        const baseVersion = base && parseFrontmatter(base).version;
        checkBump(problems, skill, "metadata.version", version, baseVersion);
      }
    }
  }
}

// Tessl takes each published skill's version from its metadata.version.
const tessl = JSON.parse(readText("tessl/skills.json"));
for (const entry of tessl.skills) {
  const path = `plugins/kopai/${entry}/SKILL.md`;
  if (!existsSync(join(ROOT, path))) {
    problems.push(`tessl/skills.json: ${entry} has no ${path}`);
  } else if (parseFrontmatter(readText(path)).version === undefined) {
    problems.push(`${path}: Tessl publishes it, so it needs metadata.version`);
  }
}

// License copies, so every way of installing gets the license text.
const license = readText("plugins/kopai/LICENSE");
const copies = [
  "LICENSE",
  ...subdirs("plugins/kopai/oncall-skills").map((s) => `${s}/LICENSE.txt`),
];
for (const path of copies) {
  if (!existsSync(join(ROOT, path))) {
    problems.push(`${path}: missing; copy plugins/kopai/LICENSE here`);
  } else if (readText(path) !== license) {
    problems.push(`${path}: differs from plugins/kopai/LICENSE; copy it again`);
  }
}

if (problems.length > 0) {
  for (const p of problems) console.error(`✘ ${p}`);
  process.exit(1);
}
console.log(
  "✔ manifests agree" + (args.base ? " and versions are bumped" : "")
);
