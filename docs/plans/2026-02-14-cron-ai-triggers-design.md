# Cron AI Triggers Design

## Overview

Two new entry points for creating cron tasks beyond the existing manual form:

1. **ccem-cron Skill** — Users invoke `/ccem-cron` inside Claude Code. Claude collects info via conversation, writes directly to `~/.ccem/cron-tasks.json`.
2. **Desktop AI Panel** — Users describe tasks in natural language on the Cron page. Streams Claude's thinking, previews the generated task, user confirms/edits before saving.

Both share the same data layer (`~/.ccem/cron-tasks.json`). Desktop app syncs on window focus.

## Task 1: ccem-cron Skill File

File: `~/.claude/skills/ccem-cron.md` (installed via CLI)

Behavior:
- Conversational: ask what the user wants automated, infer cron expression
- Auto-detect current working directory as default `working_dir`
- Read existing `~/.ccem/cron-tasks.json`, append new task, write back
- Generate UUID for task id, set `enabled: true`, `trigger_type: "schedule"`
- Support: create, list, delete tasks

CronTask JSON schema embedded in skill:
```json
{
  "id": "uuid",
  "name": "string",
  "cron_expression": "* * * * *",
  "prompt": "string",
  "working_dir": "/path",
  "env_name": "optional string",
  "enabled": true,
  "timeout_secs": 300,
  "template_id": null,
  "trigger_type": "schedule",
  "parent_task_id": null,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## Task 2: CLI `ccem setup cron`

New subcommand under `setup` group:
- Writes `ccem-cron.md` to `~/.claude/skills/ccem-cron.md`
- Creates directory if needed
- Prompts before overwriting existing file
- Success message with usage hint

## Task 3: Rust Backend `generate_cron_task_stream`

New Tauri command in `cron.rs`, pattern from `search_skills_stream`:
- Spawns `claude -p "<prompt>" --output-format stream-json`
- Prompt instructs Claude to return `{ name, cron_expression, prompt, working_dir }` JSON
- Emits `cron-ai-stream` events per line, `cron-ai-done` on completion
- Injects current environment API config (base_url, api_key, model)
- Uses `get_user_path()` + `env_remove("CLAUDECODE")`

## Task 4: Frontend AiCronPanel Component

New component: `src/components/cron/AiCronPanel.tsx`

UI flow:
1. "AI 创建" button in CronTasks page header (alongside existing "添加任务")
2. Click expands panel with natural language input + "生成" button
3. Streams thinking process (Bot/Wrench/Sparkles icons, same as DiscoverTab)
4. Parses CronTask JSON from result
5. Renders preview card with task details
6. "编辑" opens existing TaskDialog for fine-tuning
7. "确认创建" calls `add_cron_task` to save

Events: `cron-ai-stream` / `cron-ai-done`

New i18n keys in `cron` namespace for both zh.json and en.json.
