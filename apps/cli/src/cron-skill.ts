export const CCEM_CRON_SKILL_CONTENT = `# ccem-cron

Manage scheduled tasks for Claude Code via \\\`~/.ccem/cron-tasks.json\\\`. Supports creating, listing, and deleting cron tasks through conversational interaction.

## Storage

All tasks are stored in \\\`~/.ccem/cron-tasks.json\\\` as a JSON array. Each task follows this schema:

\\\`\\\`\\\`json
{
  "id": "uuid-v4",
  "name": "task name",
  "cronExpression": "0 9 * * *",
  "prompt": "Claude prompt to execute",
  "workingDir": "/absolute/path",
  "envName": null,
  "enabled": true,
  "timeoutSecs": 300,
  "templateId": null,
  "triggerType": "schedule",
  "parentTaskId": null,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
\\\`\\\`\\\`

## Instructions

Determine the user's intent from their message:
- **List/view**: user says "list", "show", "view", "查看", "列出"
- **Delete/remove**: user says "delete", "remove", "删除", "移除"
- **Create**: default for anything else

### Creating a Task

1. Ask the user for:
   - Task name (short descriptive label)
   - What they want Claude to do (natural language; derive the \\\`prompt\\\` field from this)
   - When to run it (derive the \\\`cronExpression\\\`; show common examples below)
   - Working directory (default: current directory via \\\`pwd\\\`)
   - Timeout in seconds (default: 300)

2. Show common cron patterns to help the user choose:

\\\`\\\`\\\`
Every minute:        * * * * *
Every 30 minutes:    */30 * * * *
Every hour:          0 * * * *
Every day at 9am:    0 9 * * *
Every day at midnight: 0 0 * * *
Weekdays at 9am:     0 9 * * 1-5
Every Monday 8am:    0 8 * * 1
Every 1st of month:  0 0 1 * *
\\\`\\\`\\\`

3. Generate the task and write it:

\\\`\\\`\\\`bash
# Generate UUID and timestamp
TASK_ID=\\$(uuidgen | tr '[:upper:]' '[:lower:]')
NOW=\\$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
WORK_DIR=\\$(pwd)

# Read existing file or initialize empty array
if [ -f ~/.ccem/cron-tasks.json ]; then
  EXISTING=\\$(cat ~/.ccem/cron-tasks.json)
else
  mkdir -p ~/.ccem
  EXISTING="[]"
fi

# Build new task JSON and append using python3 for safe JSON manipulation
python3 -c "
import json, sys
tasks = json.loads('''\\$EXISTING''')
tasks.append({
    'id': '\\$TASK_ID',
    'name': 'TASK_NAME_HERE',
    'cronExpression': 'CRON_EXPR_HERE',
    'prompt': 'PROMPT_HERE',
    'workingDir': '\\$WORK_DIR',
    'envName': None,
    'enabled': True,
    'timeoutSecs': TIMEOUT_HERE,
    'templateId': None,
    'triggerType': 'schedule',
    'parentTaskId': None,
    'createdAt': '\\$NOW',
    'updatedAt': '\\$NOW'
})
print(json.dumps(tasks, indent=2, ensure_ascii=False))
" > ~/.ccem/cron-tasks.json
\\\`\\\`\\\`

Replace \\\`TASK_NAME_HERE\\\`, \\\`CRON_EXPR_HERE\\\`, \\\`PROMPT_HERE\\\`, and \\\`TIMEOUT_HERE\\\` with actual values. Escape any quotes or special characters in the prompt string properly for Python.

4. Confirm creation by reading back the file and showing the new task.

### Listing Tasks

\\\`\\\`\\\`bash
if [ -f ~/.ccem/cron-tasks.json ]; then
  cat ~/.ccem/cron-tasks.json
else
  echo "No tasks found. File ~/.ccem/cron-tasks.json does not exist."
fi
\\\`\\\`\\\`

Format the output as a readable table with columns: name, cron expression, enabled status, working directory, and creation date. If the list is empty, tell the user.

### Deleting a Task

1. First list all tasks so the user can identify which to delete.
2. Ask the user to confirm by name or ID.
3. Remove the matching task:

\\\`\\\`\\\`bash
python3 -c "
import json
with open('\\$HOME/.ccem/cron-tasks.json') as f:
    tasks = json.load(f)
tasks = [t for t in tasks if t['id'] != 'TARGET_ID' and t['name'] != 'TARGET_NAME']
with open('\\$HOME/.ccem/cron-tasks.json', 'w') as f:
    json.dump(tasks, f, indent=2, ensure_ascii=False)
print(json.dumps(tasks, indent=2, ensure_ascii=False))
"
\\\`\\\`\\\`

Replace \\\`TARGET_ID\\\` or \\\`TARGET_NAME\\\` with the user's selection.

4. Confirm deletion by showing the remaining tasks.

## Safety Rules

- Always read the existing file before writing to avoid data loss.
- Use \\\`python3\\\` for JSON manipulation to ensure valid output (never hand-construct JSON with echo/cat).
- Create \\\`~/.ccem/\\\` directory if it does not exist.
- When the file is missing or empty, start with an empty array \\\`[]\\\`.
- Always show the user what will be written before confirming.
`;
