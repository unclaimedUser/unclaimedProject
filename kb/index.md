# Knowledge base index

This repo is the system of record. Chat memory holds only pointers and preferences;
anything a new session, teammate, or agent needs must live here.

## Where things live

| What | Where | Changes via |
|---|---|---|
| Tasks, backlog, Kanban status | GitHub Issues + labels | Edited freely, no PR |
| Current focus (memory bridge) | Pinned issue **"Now"** | Edited freely, no PR |
| Durable knowledge: conventions, decisions, project briefs | `kb/` | PR |
| Manuals: how to run and operate things | `docs/` | PR |
| Agent hard limits | `AGENTS.md` (loaded via `CLAUDE.md`) | PR |

Rule of thumb: if it will be stale in a week, it is an issue. If it should still be true
in a year, it is a file.

## Kanban

Open issues are the board. State is a label; closed means done.

- `status:next` — ready, do soon
- `status:doing` — in progress (keep this to 1–3)
- `status:waiting` — blocked on the owner or an outside event
- no status label — backlog
- `agent` — hand the issue to the Actions agent (adding the label starts a run)

Area labels group work: `area:platform`, `area:unclaimedlight`, `area:kb`.

## Memory bridge

Every planning session starts by reading the pinned **"Now"** issue and ends by updating it:
current focus, what changed, next three steps, open questions. That issue replaces long
chat handoffs.

## kb layout

- `kb/conventions.md` — naming, git, gates, cost rules
- `kb/decisions/NNNN-short-title.md` — one decision per file, never rewritten; supersede with a new one
- `kb/projects/<name>.md` — one brief per project

All files pass `npm run check:kb`: kebab-case names, H1 on line 1.

## Public repo rule

This repository is public. Never put personal, health, financial, or credential
information in files, issues, or comments. Personal planning stays in Chatbox memory,
Apple Calendar, and Reminders.
