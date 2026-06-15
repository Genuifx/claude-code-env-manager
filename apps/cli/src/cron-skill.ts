export const CCEM_CRON_SKILL_CONTENT = `# ccem-cron

Manage scheduled tasks for Claude Code/Codex via \`~/.ccem/cron-tasks.json\`. Supports creating, listing, and deleting cron tasks through conversational interaction.

## Storage

All tasks are stored in \`~/.ccem/cron-tasks.json\` as a JSON object with a \`tasks\` array. Do not write a bare JSON array; the desktop app reads the wrapper object.

\`\`\`json
{
  "tasks": [
    {
      "id": "cron-1781542558592-fc25",
      "name": "task name",
      "cronExpression": "0 9 * * *",
      "prompt": "Claude/Codex prompt to execute",
      "workingDir": "/absolute/path",
      "envName": null,
      "executionProfile": "conservative",
      "maxBudgetUsd": null,
      "allowedTools": [],
      "disallowedTools": [],
      "enabled": true,
      "timeoutSecs": 300,
      "templateId": null,
      "triggerType": "schedule",
      "parentTaskId": null,
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ]
}
\`\`\`

## Instructions

Determine the user's intent from their message:
- **List/view**: user says "list", "show", "view", "查看", "列出"
- **Delete/remove**: user says "delete", "remove", "删除", "移除"
- **Create**: default for anything else

### Creating a Task

1. If the user's request is specific enough, create the task directly. Ask a follow-up only when the schedule, action, or working directory is genuinely ambiguous.
   - Task name: derive a short descriptive label.
   - Prompt: derive a directly executable Claude/Codex instruction from the user's request.
   - Schedule: derive a standard 5-field \`cronExpression\`.
   - Working directory: default to the current directory via \`pwd\`.
   - Timeout: default to 300 seconds.

2. Show common cron patterns to help the user choose:

\`\`\`
Every minute:        * * * * *
Every 30 minutes:    */30 * * * *
Every hour:          0 * * * *
Every day at 9am:    0 9 * * *
Every day at midnight: 0 0 * * *
Weekdays at 9am:     0 9 * * 1-5
Every Monday 8am:    0 8 * * 1
Every 1st of month:  0 0 1 * *
\`\`\`

3. Generate the task and write it. Always preserve existing tasks:

\`\`\`bash
python3 -c "
import json, time, random
from datetime import datetime, timezone
from pathlib import Path

tasks_path = Path.home() / '.ccem' / 'cron-tasks.json'
tasks_path.parent.mkdir(parents=True, exist_ok=True)

if tasks_path.exists():
    with tasks_path.open() as f:
        data = json.load(f)
else:
    data = {'tasks': []}

if isinstance(data, list):
    data = {'tasks': data}
if not isinstance(data, dict) or not isinstance(data.get('tasks'), list):
    raise SystemExit('Invalid cron task store: expected object with tasks array')

now = datetime.now(timezone.utc).isoformat()
task = {
    'id': f'cron-{int(time.time() * 1000)}-{random.randrange(0, 0x10000):04x}',
    'name': 'TASK_NAME_HERE',
    'cronExpression': 'CRON_EXPR_HERE',
    'prompt': 'PROMPT_HERE',
    'workingDir': str(Path.cwd()),
    'envName': None,
    'executionProfile': 'conservative',
    'maxBudgetUsd': None,
    'allowedTools': [],
    'disallowedTools': [],
    'enabled': True,
    'timeoutSecs': TIMEOUT_HERE,
    'templateId': None,
    'triggerType': 'schedule',
    'parentTaskId': None,
    'createdAt': now,
    'updatedAt': now,
}
data['tasks'].append(task)
with tasks_path.open('w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\\n')
print(json.dumps(task, indent=2, ensure_ascii=False))
"
\`\`\`

Replace \`TASK_NAME_HERE\`, \`CRON_EXPR_HERE\`, \`PROMPT_HERE\`, and \`TIMEOUT_HERE\` with actual values. Escape any quotes or special characters in the prompt string properly for Python.

4. Confirm creation by reading back the file and showing the new task.

### Listing Tasks

\`\`\`bash
if [ -f ~/.ccem/cron-tasks.json ]; then
  python3 -c "import json, pathlib; data=json.loads(pathlib.Path.home().joinpath('.ccem/cron-tasks.json').read_text()); print(json.dumps(data.get('tasks', data), indent=2, ensure_ascii=False))"
else
  echo "No tasks found. File ~/.ccem/cron-tasks.json does not exist."
fi
\`\`\`

Format the output as a readable table with columns: name, cron expression, enabled status, working directory, and creation date. If the list is empty, tell the user.

### Deleting a Task

1. First list all tasks so the user can identify which to delete.
2. Ask the user to confirm by name or ID.
3. Remove the matching task:

\`\`\`bash
python3 -c "
import json
from pathlib import Path
tasks_path = Path.home() / '.ccem' / 'cron-tasks.json'
with tasks_path.open() as f:
    data = json.load(f)
if isinstance(data, list):
    data = {'tasks': data}
tasks = data.get('tasks', [])
data['tasks'] = [t for t in tasks if t['id'] != 'TARGET_ID' and t['name'] != 'TARGET_NAME']
with tasks_path.open('w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\\n')
print(json.dumps(data['tasks'], indent=2, ensure_ascii=False))
"
\`\`\`

Replace \`TARGET_ID\` or \`TARGET_NAME\` with the user's selection.

4. Confirm deletion by showing the remaining tasks.

## Safety Rules

- Always read the existing file before writing to avoid data loss.
- Always preserve the wrapper object shape: \`{ "tasks": [...] }\`.
- Use \`python3\` for JSON manipulation to ensure valid output (never hand-construct JSON with echo/cat).
- Create \`~/.ccem/\` directory if it does not exist.
- When the file is missing or empty, start with \`{ "tasks": [] }\`.
- After creating a task, always read back the store and show the task that was written. Ask for confirmation first only when the request is ambiguous or destructive.
`;
