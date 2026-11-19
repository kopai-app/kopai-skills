# kopai-skills

Kopai's agent skills and its Claude plugin. This is the only place a Kopai
skill is edited.

## Install

- **Claude** (Claude Code, claude.ai, Claude Tag): the `kopai` plugin from
  the Claude Directory (not listed yet), with all of the skills below.
- **Any other agent** (Cursor, Copilot, Codex, Gemini CLI…): the portable
  skills, with the [skills CLI](https://github.com/vercel-labs/skills):

  ```bash
  npx skills add kopai-app/kopai-skills/plugins/kopai/skills
  ```

  This installs `root-cause-analysis`, `create-dashboard` and
  `otel-instrumentation`, and `npx skills update` keeps them current. Leave
  out the path and the CLI also offers the Claude-only skills.

- **Tessl:** `tessl install kopai/<skill>` (see [Tessl](#tessl)).

## Layout

```
plugins/kopai/                 the plugin: everything in here ships to users
├── .claude-plugin/            Claude manifest (loads all three skill folders) and icon
├── .mcp.json                  Kopai's MCP server, https://api.kopai.app/v2/mcp
├── skills/                    portable skills: root-cause-analysis, create-dashboard, otel-instrumentation
├── claude-skills/             Claude-only: create-live-page (needs Claude's page runtime)
├── oncall-skills/             Claude Tag on-call workflow, the seven kopai-* skills
└── README.md, LICENSE, NOTICE
evals/kopai/                   claude plugin eval cases and mocks; ships to nobody
scripts/                       eval.sh, check-manifests.mjs, tessl-stage.mjs
tessl/skills.json              which skills Tessl publishes
test-fixtures/                 a fictional incident to dry-run on-call against a local Kopai
```

One plugin, with skills in folders that each platform's manifest selects:
Claude's loads all three; an OpenAI manifest (ChatGPT and Codex, not added
yet) will load only `skills/`.

- **`skills/`** works with any agent that has the Kopai connector or can
  run Node.
- **`claude-skills/`** needs features only Claude has.
- **`oncall-skills/`** is a stopgap until Kopai is part of Anthropic's own
  on-call offering in Claude Tag. Retiring it means deleting the folder,
  removing it from the manifest and bumping the version; admins then
  delete the watch routines and bundle instructions it set up.

See [`plugins/kopai/README.md`](plugins/kopai/README.md) for what the
plugin does for users.

## `main` is the release

Every merge to `main` is a release: the Claude Directory picks it up, and
Tessl publishes the portable skills that changed. (A marketplace file for
installing straight from this repo comes later.) So:

- a PR that changes `plugins/kopai/` bumps `version` in every manifest,
  and a changed skill that has a `metadata.version` in its `SKILL.md`
  bumps that too (CI checks both, and that the manifests agree);
- anything the change needs from Kopai's MCP server or API is deployed to
  production before the merge;
- only skills maintainers (`CODEOWNERS`) can approve.

If releases ever need batching, a `release` branch becomes what the
Directory tracks; until then there are no tags.

## Tessl

The skills in `tessl/skills.json` (the portable ones) are also published
to [Tessl](https://tessl.io) as `kopai/<skill>`, one package each, so
existing `tessl install kopai/root-cause-analysis` users keep getting
updates. Nothing Tessl-specific ships in the plugin:
`scripts/tessl-stage.mjs` builds each package in a temporary folder, with a
manifest made from the skill's `SKILL.md` (its description, and its
`metadata.version` as the Tessl version). `publish-skills.yml` publishes on
every merge to `main` that changes one, and skips versions Tessl already
has.

## Try a change locally

```bash
claude --plugin-dir plugins/kopai
npx --yes @anthropic-ai/claude-code@2.1.322 plugin validate --strict plugins/kopai
node scripts/check-manifests.mjs --base origin/main
scripts/eval.sh --runs 1 --ablation none --allow-tools Bash --judge-model sonnet
```

Evals make real model calls; on a PR, add the `run-evals` label to run them
in CI (three runs per case). See [`evals/kopai/README.md`](evals/kopai/README.md).

## License

Apache-2.0 ([`LICENSE`](LICENSE)), copyright Reactor Studio. The on-call
skills are adapted from Anthropic's
[On-Call Kit](https://github.com/anthropics/oncall-kit); see
[`plugins/kopai/NOTICE`](plugins/kopai/NOTICE). Each on-call skill folder
carries its own `LICENSE.txt`, because the skills CLI installs single skill
folders.
