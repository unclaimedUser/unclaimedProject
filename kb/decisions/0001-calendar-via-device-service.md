# 0001 — Calendar access via Chatbox device service

Date: 2026-11-16 · Status: accepted

## Context

The original plan was a custom remote MCP server (`cal.bastuck.email`, Cloudflare Worker,
iCloud CalDAV, about 7 tools). Chatbox ships a built-in Calendar device service that reads
and writes the owner's calendars on the phone. A read was verified on 2026-11-16.

## Decision

Use the Chatbox device service. Shelve the custom MCP server.

## Consequences

- Zero cost, no deploy, no secrets, no DNS change.
- Limits: Chatbox on the owner's device only; create and update of non-recurring events;
  no delete; recurring events are edited in Apple Calendar; reads return at most 100 events.
- Revisit when a non-Chatbox consumer needs calendar access: a background agent,
  a teammate, or another client. The original design brief lives in Chatbox memory and
  in this decision.
