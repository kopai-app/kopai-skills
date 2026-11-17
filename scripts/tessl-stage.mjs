#!/usr/bin/env node
// Builds the Tessl package for one portable skill in a folder of its own.
//
// WHY a staging folder: Tessl needs its manifest (.tessl-plugin/plugin.json)
// inside the folder it publishes and refuses paths outside it, but nothing
// Tessl-specific should ship inside the Claude plugin. So the manifest is
// generated here, from the skill's SKILL.md: Tessl name kopai/<skill>, the
// skill's description, and its metadata.version as the Tessl version.
//
// Usage:
//   node scripts/tessl-stage.mjs <skill> <out dir>   stage one skill
//   node scripts/tessl-stage.mjs --list              print the skills as JSON

import console from "node:console";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { readFrontmatter } from "./lib/skill-frontmatter.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(
  readFileSync(join(ROOT, "tessl/skills.json"), "utf8")
);

const [skill, outDir] = process.argv.slice(2);

if (skill === "--list") {
  console.log(JSON.stringify(config.skills));
  process.exit(0);
}
if (!skill || !outDir) {
  console.error("usage: tessl-stage.mjs <skill> <out dir> | --list");
  process.exit(2);
}
if (!config.skills.includes(skill)) {
  console.error(`${skill} is not in tessl/skills.json`);
  process.exit(1);
}

const source = join(ROOT, "plugins/kopai/skills", skill);
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
cpSync(source, outDir, { recursive: true });
mkdirSync(join(outDir, ".tessl-plugin"), { recursive: true });
const manifest = {
  name: `${config.workspace}/${skill}`,
  version,
  description,
  private: false,
  skills: ["SKILL.md"],
};
writeFileSync(
  join(outDir, ".tessl-plugin/plugin.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);
console.log(`staged ${manifest.name}@${version} in ${outDir}`);
