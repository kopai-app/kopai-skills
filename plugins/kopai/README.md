# Kopai

A plugin for investigating production issues with your OpenTelemetry
traces, logs and metrics in [Kopai](https://kopai.app). It works in
Claude Code, on claude.ai and in Claude Tag (Claude in your Slack
channels), where it can also go on call with your team, and in Grok
Build, with the skills in `skills/` (see "Use it in Grok Build").

Claude investigates, proposes and verifies; people decide and act. The
plugin never changes a system it monitors. It writes only what you ask
for, such as a dashboard, a Claude page, instrumentation code in your
application, or a Kopai alert rule. "Data and privacy" below lists every
write.

## What's in it

**Investigation and instrumentation** (`skills/`):

| Skill                  | What it does                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `root-cause-analysis`  | Investigates errors, latency and failing services from live telemetry, through the Kopai connector or the SDK |
| `create-dashboard`     | Builds a Kopai dashboard from metrics, logs and traces                                                        |
| `otel-instrumentation` | Instruments an application with OpenTelemetry and checks the telemetry against a local Kopai                  |

**Claude pages** (`claude-skills/`):

| Skill              | What it does                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-live-page` | A Claude page that charts Kopai data live for each viewer, from their own claude.ai Kopai connector (not from Slack, where pages are snapshots only) |

**On-call, for Claude Tag** (`oncall-skills/`):

| Skill                    | What it does                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `kopai-oncall-setup`     | `@Claude set up Kopai on-call here`: checks Kopai is reachable and as whom, then creates the watch routine for the alert channel on your yes  |
| `kopai-oncall-playbooks` | Optional, later: five gated phases that baseline every service, mine past incidents into playbooks in your on-call repo, set policy, validate |
| `kopai-triage`           | Investigates an alert or incident: reads a Kopai alert by its event id, queries Kopai, and posts a diagnosis with evidence and a proposed fix |
| `kopai-verify-fix`       | After a human ships a fix, re-runs the incident's queries at three checkpoints and reports whether the signal is back to baseline             |
| `kopai-handoff`          | The weekly on-call handoff, including each key service's week-over-week health from Kopai                                                     |
| `kopai-weather`          | An optional status report that posts only when something changes                                                                              |
| `kopai-evidence-page`    | On request, a snapshot page of the evidence for one incident, linked to Kopai's incident page                                                 |

The plugin declares the Kopai MCP server (`https://api.kopai.app/v2/mcp`).
It gives Claude:

- `query` and `metrics_discover`, for traces, logs and metrics;
- on a workspace with Kopai alerting, five read-only alert tools:
  `alerts_list`, `alert_get`, `alert_history`, `alert_rules_list` and
  `alert_rule_backtest`;
- through the channel's `agent` token, `alert_rule_create`, only when a
  Kopai owner gave the token the grant "may create alert rules";
- through your own sign-in, when you are a Kopai owner or admin, three
  alert write tools: `alert_rule_create`, `alert_rule_update` and
  `alert_rule_set_enabled` (create, change, pause and resume rules).

The skills never change or pause a rule: they never call
`alert_rule_update` or `alert_rule_set_enabled`, even when your sign-in
offers them, and link Kopai's rule editor instead, where an owner or
admin makes the change. The channel's `agent` token can never change or
pause a rule. Outside the skills, Claude can use your sign-in's write
tools when you ask it to, as you.

## Use it in Claude Code or on claude.ai

Install `kopai` from the Claude Directory: run `/plugin directory` in
Claude Code, or add it on claude.ai under **Customize › Plugins**, which
syncs it to Claude Code. Claude Code connects to hosted Kopai through the
plugin's MCP server and asks you to sign in the first time; there you act
as yourself.

Then ask in your own words: "why is checkout slow since this morning?",
"chart p95 latency for the payments service", "add tracing to this
service".

## Use it in Grok Build

Install `kopai` from xAI's plugin marketplace in Grok Build. Grok gets the
Kopai MCP server and the three skills in `skills/`; the Claude pages and
on-call skills need Claude and are not included. Grok asks you to sign in
to Kopai the first time (or run `/mcps`), and then acts as you:

- `query` and `metrics_discover`, and on a workspace with Kopai alerting
  the five read-only alert tools listed above;
- when you are a Kopai owner or admin, `alert_rule_create`,
  `alert_rule_update` and `alert_rule_set_enabled`. No skill calls the
  last two; Grok uses them only when you ask it to.

`create-dashboard`, and `root-cause-analysis` in code mode, run code with
the Kopai SDK and CLI rather than the MCP server. For your hosted
workspace they need a Kopai token in a `.kopairc` file: run
`npx @kopai/cli login` once in the project. `otel-instrumentation` tests
against a local Kopai it starts itself and needs no token. See "Data and
privacy".

## On-call in Claude Tag

### How Claude handles a Kopai alert

1. Kopai posts a FIRING card to your private alert channel; Claude's watch
   routine picks it up.
2. Claude takes the event id from the card's incident link and reads the
   alert with `alert_get`: what fired, the value against the threshold,
   and the query behind it.
3. It investigates with Kopai queries and replies in the thread, briefly:
   the state and how long it has lasted, the observed value against the
   threshold, the likely cause, what to look at first, and "Full evidence
   in Kopai (workspace login required)". The reply stands on its own for
   people without a Kopai login; ask for details to get the full
   diagnosis.
4. Afterwards it asks whether a rule would have caught the incident
   earlier, and proposes one as a link to Kopai's rule editor with the
   rule pre-filled and its backtest.

Alerts from other tools (Alertmanager, Grafana, a pager) are triaged with
Kopai's telemetry too, and Claude says they did not come from Kopai.

### Where your team's knowledge lives

The plugin ships the method, and triage works without anything else. A
team that wants more can keep its knowledge in an **on-call repo** it
owns, which the optional `kopai-oncall-playbooks` skill fills in:

- `ONCALL-RULES.md`: the standing rules (copied from the plugin)
- `ONCALL.md`: your policy: paging thresholds, severity, routing, and how
  alert rules are proposed and installed
- `STACK.md`: which tools are connected, and how Kopai is connected
- `BASELINES.md`: each service's normal range, measured from Kopai
- `playbooks/`: triage playbooks mined from your own incidents
- `lessons.md` and `paging-log.md`: what Claude learns and decides

Plugin updates never touch these files, and Claude's improvements to your
playbooks arrive as pull requests to your repo. In Claude Tag, a Claude
admin adds the repo to the `kopai` bundle; the setup guide says how.

### Set it up

**Connect Kopai with an agent token, not by signing in.** Anthropic's
guidance: "Anyone in a channel where the connector applies can use it
through Claude, so connect a dedicated identity you control rather than
your personal login." If Kopai is connected with someone's own login,
everyone in the channel acts as them, and Claude says so on its first
alert.

1. **Kopai › Alerting › Targets:** Add to Slack, choosing the alert channel.
2. **Kopai › Tokens:** create an `agent` token. To let Claude create rules a
   person approved, an owner switches on "may create alert rules".
3. **Claude › Organization settings › Claude Tag › Bundles** (an Owner, or
   a Claude Tag Admin): a bundle named `kopai` with
   - a Custom connector → **Bearer**, Allowed websites `api.kopai.app`,
     holding the token (**Copy setup link for another admin** lets the
     Kopai admin paste it directly; the token never goes into Slack);
   - the `kopai` plugin, from the Claude Directory listing;
   - the Instructions text in the setup guide;
   - **Where it applies:** the alert channel.
4. **In the alert channel,** as a top-level message:
   `@Claude set up Kopai on-call here`. Claude checks it can reach Kopai
   and creates the watch routine when you say yes.
5. **Kopai › Alerting › Targets › Send test message.** Claude answers it in
   its thread with a health check; that reply means onboarding worked.

Don't put the connector on the Connectors tab (it would apply in every
channel), and remove any Kopai sign-in (an MCP Connector) in the channel.
Slack Connect channels are not supported. The full guide, with the
Instructions text, the message to send your admins, the fallbacks for
getting the plugin and the known limits, is
`oncall-skills/kopai-oncall-setup/references/tag-setup.md`. Kopai's docs
walk through the same setup: <https://kopai.app/docs/claude-on-call/>.
Without Claude Tag, Claude can check your alerts on a schedule instead:
<https://kopai.app/docs/claude-scheduled-checks/>.

## Data and privacy

The plugin sends requests to Kopai's MCP server at
`https://api.kopai.app/v2/mcp`, with your sign-in or the credential your
admin configured. It reads telemetry and alerts from your Kopai workspace.
Signing in goes through Kopai's OAuth server, Supabase Auth at
`https://nfvdykzjzxurucsdbioo.supabase.co/auth/v1`, and Kopai's consent
page at `https://app.kopai.app/oauth/consent`; your agent registers itself
as an OAuth client there the first time.
In Claude Tag, the on-call skills also read from the other tools your team
connected to the channel and listed in the on-call repo's `STACK.md`, such
as GitHub (code owners, pull requests, deploys), a pager (PagerDuty or
similar), a feature-flag tool, or another metrics or log tool. They only
read from these tools, except to send a page (below).

It writes only:

- to your on-call repo, your Slack channels, and the Claude pages or
  Slack canvases you ask for;
- a page through your team's pager, when an alert meets the paging
  criteria in your `ONCALL.md`;
- a Kopai dashboard, when you ask `create-dashboard` or
  `root-cause-analysis` for one;
- your application's code and dependencies, when you ask
  `otel-instrumentation` to instrument it;
- with the `agent` token's opt-in, new Kopai alert rules that a person
  approved in the thread;
- with your own sign-in as a Kopai owner or admin, the alert rules you
  ask Claude to create, change, pause or resume.

Kopai's privacy policy: <https://kopai.app/privacy/>.

Some skills run code where the agent can run Node (Claude Code, a Claude
Tag sandbox, or Grok Build) and download packages to do so, from the
public npm registry unless noted:

- `create-dashboard`: `@kopai/cli`, to read the dashboard schema and your
  metrics before it builds anything, then `@kopai/sdk` and `tsx` to create
  the dashboard;
- `root-cause-analysis` code mode, only for questions that need many
  queries in a loop: `@kopai/sdk`, `tsx` and, as a fallback, `@kopai/cli`;
- `otel-instrumentation`: `@kopai/app` (a local Kopai to test against, on
  ports 4318 and 8000), `@kopai/cli`, and the OpenTelemetry packages for
  your language, from that language's package registry (npm, PyPI, Maven
  Central, the Go module proxy, NuGet and so on). For the Java agent it
  points to OpenTelemetry's own instructions and downloads nothing itself.

The scripts call Kopai's query API: in a Claude Tag sandbox at
`https://api.kopai.app/v2`, with the channel's credential; elsewhere at
the URL and with the token in a `.kopairc` file in the project or your
home directory, the same file the Kopai CLI uses.

## Troubleshooting

- **Claude doesn't use Kopai, or says it has no Kopai tools.** The
  plugin's Kopai connection isn't signed in. In Claude Code, run `/mcp`,
  select `kopai` and sign in. In Grok Build, run `/mcps`. On claude.ai, connect Kopai on the plugin's
  Connectors tab.
- **A question comes back with no data, though your services send
  telemetry.** Check the time window first, then the names: the column is
  `service.name`, not `ServiceName`, and a span's `StatusCode` is `Error`,
  not `ERROR`. A wrong name matches nothing instead of failing.
- **A script can't reach Kopai, or gets 401.** Code mode reads the `url`
  and `token` from `.kopairc` in the project or your home directory. Check
  both. For your hosted workspace, run `npx @kopai/cli login`; for a
  local Kopai, start it with `npx @kopai/app start`.
- **A script fails while downloading packages.** Code mode needs Node.js
  and the public npm registry. Claude Tag's default "Limited access"
  sandbox reaches the npm registry; a stricter environment needs it added.
- **On-call in Claude Tag doesn't answer an alert.** Press **Send test
  message** in Kopai › Alerting › Targets. If Claude doesn't answer it,
  follow "Verifying it worked" in
  `oncall-skills/kopai-oncall-setup/references/tag-setup.md`.

## Support

- **Questions and bugs:** open an issue at
  <https://github.com/kopai-app/kopai-skills/issues>, with the `version`
  from `.claude-plugin/plugin.json` or `.grok-plugin/plugin.json` (they
  match). You can also email
  <hello@kopai.app>.
- **Security problems:** don't open a public issue. Report them privately
  as the [security policy](https://github.com/kopai-app/kopai-skills/security/policy)
  describes.

## Credits

The on-call setup, triage, handoff and weather skills, the templates and
the standing rules are adapted from Anthropic's
[On-Call Kit](https://github.com/anthropics/oncall-kit) (Apache-2.0). See
`NOTICE` for what changed.
