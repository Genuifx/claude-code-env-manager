export const CCEM_BOT_BIND_SKILL_CONTENT = `# ccem-bot-bind

Bind the current CCEM-launched Claude Code session to a bot target such as WeCom or Weixin.

Use this skill when the user asks to bind, attach, connect, or push the current task/session to a bot, chat, WeCom, Weixin, Telegram, or a remote task card.

## What this skill does

- Creates a bot-binding request for the current CCEM runtime.
- Relies on \`CCEM_RUNTIME_ID\` or \`CCEM_SESSION_ID\`, which CCEM injects into sessions it launches.
- Writes the request to \`~/.ccem/bot-bind-requests.jsonl\`.
- CCEM Desktop consumes the request and binds the matching session to the bot outbox.

## Required inputs

Ask for any missing target information:

- \`platform\`: one of \`wecom\`, \`weixin\`, or \`telegram\`.
- \`peer_id\`: user id, chat id, group id, or equivalent target id.
- For WeCom, include \`bot_id\` when known.

## Command

Run:

\`\`\`bash
ccem bot-bind --platform <platform> --peer-id <peer_id> --title "<short task title>" --summary "<one sentence summary>"
\`\`\`

For WeCom:

\`\`\`bash
ccem bot-bind --platform wecom --bot-id <bot_id> --peer-id <userid_or_chatid> --title "<short task title>" --summary "<one sentence summary>"
\`\`\`

If the user only wants to create the binding without pushing a task card, add \`--no-send-card\`.

If CCEM did not inject a runtime id, ask the user for the runtime id or list sessions with:

\`\`\`bash
ccem sessions
\`\`\`

Then pass:

\`\`\`bash
ccem bot-bind --runtime-id <runtime_id> --platform <platform> --peer-id <peer_id>
\`\`\`

## Behavior rules

- Do not invent peer ids or bot ids.
- Keep the title short enough for a task card.
- Include a summary that explains what this session is currently doing.
- After the command succeeds, tell the user the request was queued and CCEM Desktop will consume it when running.
- Do not ask the bot target to execute shell commands; user commands should flow back through the CCEM binding.
- For WeCom, authorization and target membership are owned by the configured WeCom bot; do not create a separate allowlist.
`;
