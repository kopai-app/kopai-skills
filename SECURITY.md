# Security policy

This policy covers the `kopai` plugin and the skills in this repository.

## What to report

For example:

- a skill that sends data, runs code or fetches anything that the plugin's
  README doesn't disclose;
- telemetry content, such as a log line, a span attribute or an alert
  annotation, that leads Claude, following these skills, to take an action
  nobody asked for;
- a skill that leads Claude to expose a Kopai token, for example by printing
  it in a Slack thread.

Report these elsewhere:

- a problem in Claude, Claude Code, claude.ai or Claude Tag: to Anthropic,
  under its
  [responsible disclosure policy](https://www.anthropic.com/responsible-disclosure-policy);
- a problem in a dependency that doesn't affect this plugin: to that
  project.

## Report a vulnerability

Email <hello@kopai.app> with "Security" in the subject. Don't open a public
issue.

Say which plugin `version` (from `plugins/kopai/.claude-plugin/plugin.json`)
or skill `metadata.version` you used, how to reproduce the problem, and what
an attacker could do with it.

## What happens next

- We reply within 3 business days to say we have your report.
- We tell you whether we consider it a vulnerability, and keep you updated
  until it's fixed.
- The fix ships in a new plugin version, and in a new version of each
  changed skill that's published on Tessl. Only the latest version gets
  fixes.
- We agree a disclosure date with you, no later than 90 days after your
  report, and publish a GitHub security advisory then. It credits you
  unless you'd rather not be named.

We do not run a bug bounty program.
