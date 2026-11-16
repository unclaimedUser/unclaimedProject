# Agent pipeline

The agent is Claude Code running in GitHub Actions (`.github/workflows/agent.yml`),
using OpenRouter credits. It never merges; the owner does.

## Hand off a task

1. Write an issue a stranger could execute: goal, files to touch, what done looks like.
2. Add the `agent` label. Only the owner's label starts a run.
3. Watch for "Agent started." on the issue, then a PR within a few minutes.

Opening or editing an issue does nothing. Only the label costs credits.

## Review

- The PR body shows **Verification: PASS/FAIL** with the output of `npm test` and
  `npm run check:kb`, run by the agent job itself.
- PRs opened by the agent do not trigger the `ci` workflow (GitHub does not start
  workflows from events created with the built-in token). The verification block is
  the substitute. PRs opened by the owner or chat do run `ci`.
- Merge from GitHub Mobile. The branch is deleted automatically.

## Re-run

The label is removed when a run ends. Add it again to re-run; the agent resets
`agent/issue-<n>` and updates the existing PR.

## When it goes wrong

| Comment on the issue | Meaning |
|---|---|
| No changes produced | The agent made no commits. The log tail says why. |
| Job failed | Read the log tail, then the Actions tab. |
| Nothing after 2 minutes | Normal. The cap is 45 minutes; cancel from Actions after 15. |
