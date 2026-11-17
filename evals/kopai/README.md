# Kopai plugin evals

[`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals) cases
that run the `kopai` plugin's skills against mocked Kopai tools. Every case uses
one fictional incident: checkout 1.5.0, deployed at 13:58 UTC on
2026-11-09, lowered its client timeout to payments to 200 ms, and Kopai's
"checkout latency" rule fired at 14:02 UTC (event `812`).

| case                      | checks                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kopai-alert-firing`      | the event id is read from the incident link, `alert_get` is called, and the reply quotes `observed.text`, links the incident page and stands on its own |
| `kopai-alert-owner-login` | Kopai connected with an owner's own login: Claude warns once and still triages                                                                          |
| `foreign-alert`           | an Alertmanager post: no alert tools, telemetry only, and the reply says it is not a Kopai alert                                                        |
| `test-message`            | Kopai's "Send test message" gets the four-line health check in its thread, not a triage                                                                 |
| `rule-proposal`           | duplicate check by `metric_name`, a backtest, the editor link and the rule JSON; no rule is created or changed                                          |
| `plain-slow-api`          | a plain "why is my API slow", with no alert and no on-call repo, fires `root-cause-analysis` and never `kopai-triage`                                   |
| `plain-api-down`          | "payments is slow, is the API down?" (the phrasing `kopai-triage` used to list) also fires `root-cause-analysis`, not `kopai-triage`                    |

`mocks/kopai/` answers the Kopai MCP server's tools. `query`,
`alert_rules_list` and `alert_rule_backtest` are agent mocks that answer
from the incident described in their files; the other tools return fixed
bodies. `_tools.json` holds the real tools' schemas and descriptions, so a
call production would refuse is refused here too. A case's own `mocks/` overrides
them file by file.

The cases live here, outside the plugin, so they never ship to users.
`claude plugin eval` only reads an eval directory inside the plugin, so
`scripts/eval.sh` copies this folder into `plugins/kopai/eval-run-<pid>/`
(gitignored), runs the eval and removes the copy. Paths you pass, such as
`--json`, are relative to where you run it. A run may offer mock
recordings to adopt: copy them into `mocks/.replay/kopai/` here, not into
the `eval-run-*` path it prints, which is gone by then. Run it from the repo
root (Claude Code 2.1.269 or later). Each run makes real model calls, so
start with one run per case:

```bash
scripts/eval.sh --runs 1 --ablation none --allow-tools Bash --judge-model sonnet
scripts/eval.sh --tag routing --runs 3 --ablation none
```

Extra arguments go to `claude plugin eval`. Results land in
`evals/kopai/results/` (gitignored). `rule-proposal` needs `Bash` to
encode the editor link. The `llm` graders need a capable judge: the
default background model fails correct replies. Keep `--ablation none`
for pass/fail: without it, the eval adds a no-plugin baseline and the
`tool_used: Skill` graders stop counting toward the score, so a routing
guard passes even when no skill fires. Drop it only to compare against a
session without the plugin.

`kopai-alert-firing` and `rule-proposal` pass about one run in three:
their graders are loose, and hardening them is still to do.
