# AGENTS.md — hard limits

Read `kb/conventions.md` before acting. This file overrides convenience.

## Never
- Edit, move, or delete anything under `.github/`. Workflows are owner-only.
- Push to `main`. Always work on `agent/issue-<n>` and open a PR.
- Commit a secret, token, key, or `.env` file, even a fake one.
- Run `wrangler deploy`, `wrangler versions deploy`, or any production rollout.
- Change DNS. Never touch MX, SPF, DKIM, DMARC, or Proton Mail verification TXT.
- Delete files or branches not created by the current task.
- Send outbound notifications, emails, or invitations.
- Add a runtime dependency without being asked to. Prefer the standard library.

## Always
- Work only on what the issue asks. No opportunistic refactors.
- Leave the repo runnable: if you add code, note in the PR body how it was checked.
- Keep commits to one logical change. Prefix with `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- State what you could not do rather than guessing. A partial, honest PR beats a wrong one.
- Put the reasoning for non-obvious decisions in comments next to the code.

## Scope
One issue → one branch → one PR. Do not open extra issues or PRs.
