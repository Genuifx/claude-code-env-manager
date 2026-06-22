---
name: ccem
description: Use when the user asks an agent to operate CCEM or CCEM Desktop, including creating workspace sessions, opening or inspecting ccem:// session links, monitoring task progress, scheduling CCEM cron work, or using bot binding flows. Prefer structured `ccem ... --json` commands.
---

# CCEM

Use CCEM as the local control plane for Codex, Claude Code, and related desktop workflows. Prefer the `ccem` CLI JSON wrappers over direct files or ad hoc HTTP calls.

## Desktop Session Control

Start every desktop-control workflow by checking the live desktop bridge:

```bash
ccem desktop health --json
```

If it is healthy, create sessions through the desktop CLI wrapper:

```bash
ccem desktop create --provider codex --cwd /absolute/project/path --prompt "Task to run" --perm dev --effort low --open true --json
```

Use absolute working directories. Preserve the returned `runtimeId`, `sessionId`, and `ccem://` link when reporting progress or sending follow-up input.

Common follow-up commands:

```bash
ccem desktop sessions --json
ccem desktop status <runtimeId> --json
ccem desktop events <runtimeId> --json
ccem desktop send <runtimeId> --text "Follow-up instruction" --json
ccem desktop open <ccem://session-link> --json
```

When the user gives a `ccem://` link, use the desktop CLI wrapper to open or inspect it. Do not try to parse provider history directories yourself unless the wrapper reports that the desktop bridge is unavailable.

## Cron And Scheduled Work

For scheduled CCEM work, use the `ccem cron` CLI. Do not edit CCEM cron storage files directly.

Useful checks:

```bash
ccem cron list --json
ccem cron runs <taskId> --json
```

Create or update tasks with the CLI options exposed by the installed `ccem cron` command. If the user asks for a schedule in natural language, resolve it to an explicit cron expression before creating or updating the task.

## Bot Binding

For Telegram, WeCom, Weixin, or other bot-bound sessions, use the `ccem bot-bind` CLI flow when available. Do not invent peer IDs or binding IDs. Query existing bindings first, then act on the exact IDs returned by CCEM.

## Safety Rules

- Do not read or write ~/.ccem/control.json directly.
- Do not call CCEM's loopback HTTP port yourself.
- Do not embed, log, or copy desktop control tokens.
- Do not edit CCEM config, cron, or session stores by hand unless the user explicitly asks for recovery work and the CLI path cannot do it.
- Ask before destructive session actions when the target session is ambiguous.

## Response Shape

When you start work through CCEM, report:

- The provider and absolute working directory.
- The returned runtime or session ID.
- The current status command you will use for follow-up.
- The `ccem://` link when CCEM returns one.
