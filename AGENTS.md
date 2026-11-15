# Agent instructions

You are working in the unclaimedProject repo. Read `kb/conventions.md` first and
follow it exactly.

## Hard limits
- Never modify `.github/workflows/**`. Changes there are proposed in the PR
  description, not committed.
- Never commit secrets, `.env`, `.dev.vars`, or anything in `.gitignore`.
- Never push to `main`. Work on the branch you were given.
- Never run `wrangler deploy`, alter DNS, or touch mail records.
- If a task needs a decision you cannot make, stop and say so in the PR body.

## Before you open a PR
- `npm run lint` and `npm test` if they exist, and report failures honestly.
- Update `docs/` or `kb/` if behaviour changed.
- Keep the diff scoped to the issue. Unrelated cleanup belongs in its own issue.