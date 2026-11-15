# Conventions

Repo `unclaimedProject`. Local work happens in GitHub Actions; the human works
from an iPhone. Namespace `@unclaimed`. Branch `main` only. Tags `vX.Y.Z-rc.N`.

## Names

- npm package: `@unclaimed/<name>`
- app folder: `apps/<kebab-app>`; Worker name `unclaimed-<app>`
- MCP server protocol name: kebab-case (`unclaimedlight`, `apple-calendar`)
- MCP tool: snake_case `<resource>_<action>` — `calendar_list_events`
- D1: `up_<app>_<env>`; R2: `up-<app>-<purpose>`
- env vars: SCREAMING_SNAKE, app-prefixed when ambiguous (`CAL_TIMEZONE`)
- docs: `docs/specs/vX.Y.Z-rc.N.md`, `docs/runbooks/<app>.md`
- kb: `kb/<topic>/<slug>.md`, one topic per file

## How work happens

An issue is a task. Opening an issue runs the agent, which pushes a branch and
opens a pull request. The human reviews the diff and merges. Nothing reaches
`main` except through a merged PR.

Write issues for a person who cannot see the conversation: state the goal, the
file to touch, and what done looks like. Vague issues produce vague diffs.

## Git

Conventional prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
Release candidates are annotated tags. No long-lived branches. A rollback is a
revert, never a force-push to `main`.

## Gates before anything reaches production

1. docs updated
2. automated tests, plus a written note on what they cover
3. code commentary on every non-obvious decision
4. preview verified
5. explicit owner approval, then merge

## Never, without explicit approval

Production rollout · DNS changes · secret mutation · deletions · outbound
notifications or invitations. Proton Mail records (MX, SPF, DKIM, DMARC,
verification TXT) are never touched, for any reason.

## Cost

Free tier first, then a reasonable one-time purchase, then a cheap subscription.
Cloudflare free tier runs the servers; OpenRouter credits are the only variable
cost and are capped at $20.
