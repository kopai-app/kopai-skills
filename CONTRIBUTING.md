# Contributing

1. **Branch and open a PR.** Nobody pushes to `main`: a merge is a release.
2. **Put the skill in the right folder.** `skills/` if it works on any
   platform, `claude-skills/` if it needs a Claude-only feature,
   `oncall-skills/` only for the Claude Tag on-call workflow.
3. **Write the description for routing.** Say when to use the skill and
   when to use a neighbour instead. A general question ("why is my API
   slow") must not fire an on-call skill; `evals/kopai/plain-slow-api`
   guards that.
4. **Bump `version`** in every manifest under `plugins/kopai/` (patch for
   fixes and wording, minor for a new skill or behaviour, major for a
   removed skill), and `metadata.version` in the `SKILL.md` of every skill
   you changed that has one: it is the Tessl version. CI fails without
   either.
5. **Deploy first.** If the change calls a Kopai tool or API that isn't in
   production yet, it waits.
6. **Run the evals** for skills you touched, locally or with the
   `run-evals` label, and say in the PR how many runs passed.
7. **A new portable skill for Tessl** gets a `metadata.version` and a
   one-line `description` in its `SKILL.md`, and its name in
   `tessl/skills.json`.
8. **Keep the README honest.** A new write, a new download from npm or a
   new MCP tool goes in `plugins/kopai/README.md` under "Data and privacy".

Validate before pushing:

```bash
npx --yes @anthropic-ai/claude-code@2.1.322 plugin validate --strict plugins/kopai
node scripts/check-manifests.mjs --base origin/main
```
