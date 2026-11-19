#!/usr/bin/env node
// Builds the Tessl package for one skill in tessl/skills.json, in a folder
// of its own. tessl/skills.json lists skill folders relative to plugins/kopai.
//
// WHY a staging folder: Tessl needs its manifest (.tessl-plugin/plugin.json)
// inside the folder it publishes and refuses paths outside it, but nothing
// Tessl-specific should ship inside the Claude plugin. So the manifest is
// generated here, from the skill's SKILL.md: Tessl name kopai/<skill>, the
// skill's description, and its metadata.version as the Tessl version.
//
// WHY skills/<skill>/ inside the package: Tessl packs a skill folder only
// when `skills` names the folder, and treats a rules/ folder at the package
// root as always-on agent rules. Staged at the root with "skills":
// ["SKILL.md"], RCA 1.6.0 shipped without references/ and with its rules/
// installed as Cursor rules.
//
// Usage:
//   node scripts/tessl-stage.mjs <skill> <out dir>   stage one skill
//   node scripts/tessl-stage.mjs --source <skill>    print its folder
//   node scripts/tessl-stage.mjs --list              print the skills as JSON

import console from "node:console";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { readFrontmatter } from "./lib/skill-frontmatter.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(
  readFileSync(join(ROOT, "tessl/skills.json"), "utf8")
);

/** Skill name (its folder's name) → folder relative to the repo root. */
const folders = new Map(
  config.skills.map((entry) => [basename(entry), `plugins/kopai/${entry}`])
);

const [first, second] = process.argv.slice(2);

if (first === "--list") {
  console.log(JSON.stringify([...folders.keys()]));
  process.exit(0);
}
const skill = first === "--source" ? second : first;
const outDir = first === "--source" ? undefined : second;
if (!skill || (first !== "--source" && !outDir)) {
  console.error(
    "usage: tessl-stage.mjs <skill> <out dir> | --source <skill> | --list"
  );
  process.exit(2);
}
if (!folders.has(skill)) {
  console.error(`${skill} is not in tessl/skills.json`);
  process.exit(1);
}
if (first === "--source") {
  console.log(folders.get(skill));
  process.exit(0);
}

const source = join(ROOT, folders.get(skill));
const { name, description, version } = readFrontmatter(
  join(source, "SKILL.md")
);
const problems = [];
if (name !== skill) problems.push(`name is "${name}", expected "${skill}"`);
if (!description || /^[>|]/.test(description))
  problems.push("description must be a one-line string");
if (!/^\d+\.\d+\.\d+$/.test(version ?? ""))
  problems.push(`metadata.version "${version}" is not x.y.z`);
if (problems.length > 0) {
  for (const p of problems) console.error(`✘ ${skill}/SKILL.md: ${p}`);
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
cpSync(source, join(outDir, "skills", skill), { recursive: true });
mkdirSync(join(outDir, ".tessl-plugin"), { recursive: true });
const manifest = {
  name: `${config.workspace}/${skill}`,
  version,
  description,
  private: false,
  skills: [`./skills/${skill}`],
};
writeFileSync(
  join(outDir, ".tessl-plugin/plugin.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);
console.log(`staged ${manifest.name}@${version} in ${outDir}`);
