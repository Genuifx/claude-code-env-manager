use super::{BotBindingInfo, BotBindingOutboxFrameKind};
use crate::event_bus::{SessionEventPayload, SessionEventRecord};

pub(super) struct EventSummary {
    pub(super) kind: BotBindingOutboxFrameKind,
    pub(super) title: String,
    pub(super) text: String,
}

pub(super) fn summarize_session_event(event: &SessionEventRecord) -> Option<EventSummary> {
    summarize_payload(&event.payload)
}

pub(super) fn summarize_payload(payload: &SessionEventPayload) -> Option<EventSummary> {
    match payload {
        SessionEventPayload::UserPrompt { text, .. } => Some(EventSummary {
            kind: BotBindingOutboxFrameKind::EventUpdate,
            title: "User prompt".to_string(),
            text: truncate_text(text, 1200),
        }),
        SessionEventPayload::SystemMessage { message } => Some(EventSummary {
            kind: BotBindingOutboxFrameKind::EventUpdate,
            title: "System message".to_string(),
            text: truncate_text(message, 1200),
        }),
        SessionEventPayload::Lifecycle { stage, detail } => Some(EventSummary {
            kind: BotBindingOutboxFrameKind::EventUpdate,
            title: format!("Lifecycle · {stage}"),
            text: truncate_text(detail, 1200),
        }),
        SessionEventPayload::StdErrLine { line } if !line.trim().is_empty() => Some(EventSummary {
            kind: BotBindingOutboxFrameKind::Error,
            title: "stderr".to_string(),
            text: truncate_text(line, 1200),
        }),
        SessionEventPayload::AssistantChunk { text } if !text.trim().is_empty() => {
            Some(EventSummary {
                kind: BotBindingOutboxFrameKind::EventUpdate,
                title: "Assistant update".to_string(),
                text: truncate_text(text, 1600),
            })
        }
        SessionEventPayload::ToolUseStarted {
            raw_name,
            input_summary,
            ..
        } => Some(EventSummary {
            kind: BotBindingOutboxFrameKind::EventUpdate,
            title: format!("Tool started · {raw_name}"),
            text: truncate_text(input_summary, 1200),
        }),
        SessionEventPayload::ToolUseCompleted {
            raw_name,
            result_summary,
            success,
            ..
        } => Some(EventSummary {
            kind: if *success {
                BotBindingOutboxFrameKind::EventUpdate
            } else {
                BotBindingOutboxFrameKind::Error
            },
            title: format!("Tool completed · {raw_name}"),
            text: truncate_text(result_summary, 1200),
        }),
        SessionEventPayload::PermissionRequired {
            request_id,
            tool_name,
            input_summary,
        } => Some(EventSummary {
            kind: BotBindingOutboxFrameKind::PermissionPrompt,
            title: format!("Permission required · {tool_name}"),
            text: truncate_text(
                &format!(
                    "request_id: {}\n{}",
                    request_id,
                    input_summary.as_deref().unwrap_or("")
                ),
                1200,
            ),
        }),
        SessionEventPayload::PermissionResponded {
            request_id,
            approved,
            responder,
        } => Some(EventSummary {
            kind: BotBindingOutboxFrameKind::EventUpdate,
            title: "Permission responded".to_string(),
            text: format!("request_id: {request_id}\napproved: {approved}\nresponder: {responder}"),
        }),
        SessionEventPayload::SessionCompleted { reason } => Some(EventSummary {
            kind: BotBindingOutboxFrameKind::SessionCompleted,
            title: "Session completed".to_string(),
            text: truncate_text(reason, 1200),
        }),
        SessionEventPayload::TerminalPromptRequired { prompt_text, .. } => Some(EventSummary {
            kind: BotBindingOutboxFrameKind::PermissionPrompt,
            title: "Terminal prompt required".to_string(),
            text: truncate_text(prompt_text, 1200),
        }),
        SessionEventPayload::TerminalPromptResolved { approved, .. } => Some(EventSummary {
            kind: BotBindingOutboxFrameKind::EventUpdate,
            title: "Terminal prompt resolved".to_string(),
            text: format!("approved: {approved}"),
        }),
        SessionEventPayload::TokenUsage {
            input_tokens,
            output_tokens,
            total_cost_usd,
            ..
        } => Some(EventSummary {
            kind: BotBindingOutboxFrameKind::EventUpdate,
            title: "Token usage".to_string(),
            text: format!(
                "input: {input_tokens}\noutput: {output_tokens}\ncost_usd: {}",
                total_cost_usd
                    .map(|cost| format!("{cost:.6}"))
                    .unwrap_or_else(|| "n/a".to_string())
            ),
        }),
        SessionEventPayload::ContextUsage {
            used_tokens,
            max_tokens,
            percentage,
            model,
            ..
        } => Some(EventSummary {
            kind: BotBindingOutboxFrameKind::EventUpdate,
            title: "Context usage".to_string(),
            text: format!("{model}: {used_tokens}/{max_tokens} ({percentage:.1}%)"),
        }),
        SessionEventPayload::ClaudeJson { .. } | SessionEventPayload::GapNotification { .. } => {
            None
        }
        SessionEventPayload::StdErrLine { .. } | SessionEventPayload::AssistantChunk { .. } => None,
    }
}

pub(super) fn format_task_card(info: &BotBindingInfo) -> String {
    let summary = info
        .task_summary
        .as_deref()
        .unwrap_or("No summary provided.");
    let bot_id = info.bot_id.as_deref().unwrap_or("n/a");
    format!(
        "title: {}\ntask_id: {}\nruntime_id: {}\nplatform: {}\nbot_id: {}\npeer_id: {}\ncorrelation_marker: {}\nsummary: {}",
        info.task_title,
        info.task_id,
        info.runtime_id,
        info.platform.display_name(),
        bot_id,
        info.peer_id,
        info.correlation_marker,
        summary
    )
}

pub(super) fn format_inbound_prompt(
    info: &BotBindingInfo,
    text: &str,
    quoted_task_id: Option<&str>,
) -> String {
    let quoted = quoted_task_id.unwrap_or(&info.task_id);
    format!(
        "[ccem bot-bound command]\nplatform: {}\npeer_id: {}\nruntime_id: {}\ntask_id: {}\nquoted_task_id: {}\ncorrelation_marker: {}\n\n{}",
        info.platform.display_name(),
        info.peer_id,
        info.runtime_id,
        info.task_id,
        quoted,
        info.correlation_marker,
        text
    )
}

pub(super) fn truncate_text(text: &str, max_chars: usize) -> String {
    if text.chars().count() <= max_chars {
        return text.to_string();
    }
    let mut truncated = text.chars().take(max_chars).collect::<String>();
    truncated.push_str("...");
    truncated
}
