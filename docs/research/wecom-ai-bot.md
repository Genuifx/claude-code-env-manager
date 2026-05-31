# Enterprise WeChat AI Bot Research

Date: 2026-05-31

## Protocol Decision

The supplied credentials are `Bot ID` values that start with `aib...` plus per-bot `Secret` values. That maps to Enterprise WeChat's AI Bot API mode over WebSocket long connection. This is different from the older group robot webhook, which is mainly an outbound notification endpoint and does not give the app an inbound conversation stream.

The desktop implementation should therefore connect outward to `wss://openws.work.weixin.qq.com`, authenticate with `aibot_subscribe`, receive `aibot_msg_callback`, and answer with `aibot_respond_msg`. This avoids requiring a public callback URL for local desktop use.

## Mainstream Implementations Reviewed

- `@wecom/aibot-node-sdk` 1.0.7: official Node SDK. It documents auth frames, heartbeat frames, `aibot_msg_callback`, stream replies, message types, quote payloads, file decrypt keys, upload, and ack queues. Source: https://github.com/WecomTeam/aibot-node-sdk
- `WecomTeam/wecom-openclaw-plugin`: official OpenClaw plugin. It uses WebSocket by default, supports Bot mode and Agent mode, and exposes access-control and media settings. Source: https://github.com/WecomTeam/wecom-openclaw-plugin
- `sunnoy/openclaw-plugin-wecom`: community enhanced OpenClaw plugin. It adds multi-account config, dynamic agent routing, command allowlists, admin bypass, group mention policy, dedupe, mixed message parsing, quote passthrough, and stream throttling. Source: https://github.com/sunnoy/openclaw-plugin-wecom
- `WecomTeam/wecom-cli`: official CLI for WeCom product APIs. It confirms Bot ID / Secret as optional AI Bot credentials and provides broader WeCom API context. Source: https://github.com/WecomTeam/wecom-cli
- AstrBot WeCom AI Bot adapter: confirms single chat and internal group chat usage, stream support, image/text constraints, and optional webhook for richer outbound media. Source: https://github.com/AstrBotDevs/astrbot_plugin_wecom
- `wenerme/go-wecom`: broad Go SDK with WebSocket AI Bot client and robot webhook support. Source: https://github.com/wenerme/go-wecom

## Constraints And Design Takeaways

- One process can manage multiple bots by running one client/worker per Bot ID. The official Node SDK models one `WSClient` per bot.
- A botId can have only one active long connection at a time. A `disconnected_event` usually means another instance took over the same bot.
- The first reply should be sent quickly. A stream placeholder with `finish=false` is the safest local-desktop UX.
- Stream content is full replacement, not append-only. The bridge should buffer runtime output and send latest full content at a throttled interval, then send a final `finish=true`.
- The WebSocket protocol uses ack frames keyed by `headers.req_id`; replies for the same req_id should be serialized to avoid queue buildup.
- Message types include `text`, `image`, `mixed`, `voice`, `file`, and `video`. The ccem scope supports text, mixed text/image extraction, quote context, and image download/decrypt into the bound workspace using the short-lived encrypted URL plus `aeskey`.
- Group chat can work directly in API mode. Some products default to `@bot` in groups; make this configurable with `requireMention`.
- For ccem safety, ordinary users should be constrained by intent before a runtime is created. Admin users bypass this gate and can use arbitrary prompts.
- Secrets must stay in local user config only, never in source, tests, docs, screenshots, or committed artifacts.
