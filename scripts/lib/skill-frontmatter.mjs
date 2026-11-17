// Reads the fields the repo's scripts need from a SKILL.md frontmatter:
// name, a one-line description and metadata.version. Not a YAML parser; it
// handles the plain, single- and double-quoted one-line values our skills use.

import { readFileSync } from "node:fs";

function unquote(value) {
  if (value.startsWith('"')) return JSON.parse(value);
  if (value.startsWith("'")) return value.slice(1, -1).replaceAll("''", "'");
  return value;
}

/** Returns { name, description, version } from a SKILL.md's text. */
export function parseFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return {};
  const block = match[1];
  const field = (re) => {
    const m = re.exec(block);
    return m ? unquote(m[1].trim()) : undefined;
  };
  return {
    name: field(/^name:\s*(.+)$/m),
    description: field(/^description:\s*(.+)$/m),
    version: field(/^metadata:\n(?:\s+.+\n)*?\s+version:\s*(.+)$/m),
  };
}

export function readFrontmatter(path) {
  return parseFrontmatter(readFileSync(path, "utf8"));
}
