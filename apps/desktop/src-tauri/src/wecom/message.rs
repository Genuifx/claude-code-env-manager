use super::types::WecomBotConfig;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct WecomIncomingMessage {
    #[serde(default)]
    pub chatid: Option<String>,
    pub chattype: String,
    pub from: WecomFrom,
    pub msgtype: String,
    #[serde(default)]
    text: Option<TextContent>,
    #[serde(default)]
    image: Option<MediaContent>,
    #[serde(default)]
    mixed: Option<MixedContent>,
    #[serde(default)]
    voice: Option<TextContent>,
    #[serde(default)]
    quote: Option<QuoteContent>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WecomFrom {
    pub userid: String,
}

#[derive(Debug, Clone, Deserialize)]
struct TextContent {
    #[serde(default)]
    content: String,
}

#[derive(Debug, Clone, Deserialize)]
struct MediaContent {
    #[serde(default)]
    url: String,
    #[serde(default)]
    aeskey: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct MixedContent {
    #[serde(default)]
    msg_item: Vec<MixedItem>,
}

#[derive(Debug, Clone, Deserialize)]
struct MixedItem {
    msgtype: String,
    #[serde(default)]
    text: Option<TextContent>,
    #[serde(default)]
    image: Option<MediaContent>,
}

#[derive(Debug, Clone, Deserialize)]
struct QuoteContent {
    msgtype: String,
    #[serde(default)]
    text: Option<TextContent>,
    #[serde(default)]
    image: Option<MediaContent>,
    #[serde(default)]
    mixed: Option<MixedContent>,
    #[serde(default)]
    voice: Option<TextContent>,
}

pub struct NormalizedMessage {
    pub text: String,
    pub attachments: Vec<NormalizedAttachment>,
    pub quote: Option<String>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct UserAdmissionDecision {
    pub allow: bool,
    #[serde(default)]
    pub reason: String,
}

#[derive(Debug, Clone)]
pub struct NormalizedAttachment {
    pub kind: String,
    pub url: String,
    pub aeskey: Option<String>,
    pub local_path: Option<String>,
    pub error: Option<String>,
}

impl NormalizedMessage {
    pub fn to_prompt(&self) -> String {
        let mut parts = Vec::new();
        if let Some(quote) = self.quote.as_ref() {
            parts.push(format!("Quoted previous message:\n{quote}"));
        }
        if !self.attachments.is_empty() {
            parts.push(format!(
                "Attachments:\n{}",
                self.attachments
                    .iter()
                    .map(format_attachment)
                    .collect::<Vec<_>>()
                    .join("\n")
            ));
        }
        if !self.text.trim().is_empty() {
            parts.push(self.text.clone());
        }
        parts.join("\n\n")
    }
}

pub fn normalize_message(message: &WecomIncomingMessage) -> NormalizedMessage {
    let mut text = String::new();
    let mut attachments = Vec::new();
    match message.msgtype.as_str() {
        "text" => {
            text = message
                .text
                .as_ref()
                .map(|v| v.content.clone())
                .unwrap_or_default()
        }
        "voice" => {
            text = message
                .voice
                .as_ref()
                .map(|v| v.content.clone())
                .unwrap_or_default()
        }
        "image" => push_media(&mut attachments, "image", message.image.as_ref()),
        "mixed" => push_mixed(&mut text, &mut attachments, message.mixed.as_ref()),
        _ => {}
    }
    let quote = message.quote.as_ref().map(format_quote);
    NormalizedMessage {
        text,
        attachments,
        quote,
    }
}

pub fn is_admin(bot: &WecomBotConfig, user_id: &str) -> bool {
    bot.admin_user_ids
        .iter()
        .any(|value| value.trim() == user_id)
}

pub fn is_actor_allowed(bot: &WecomBotConfig, user_id: &str) -> bool {
    is_admin(bot, user_id)
        || bot.allowed_user_ids.is_empty()
        || bot
            .allowed_user_ids
            .iter()
            .any(|value| value.trim() == user_id)
}

pub fn is_group_allowed(bot: &WecomBotConfig, chatid: Option<&str>) -> bool {
    bot.allowed_group_chat_ids.is_empty()
        || chatid.is_some_and(|chatid| {
            bot.allowed_group_chat_ids
                .iter()
                .any(|value| value.trim() == chatid)
        })
}

pub fn contains_mention(bot: &WecomBotConfig, text: &str) -> bool {
    bot.mention_patterns.is_empty()
        || bot
            .mention_patterns
            .iter()
            .filter(|pattern| !pattern.trim().is_empty())
            .any(|pattern| text.contains(pattern.trim()))
}

pub fn build_user_admission_prompt(
    policy: &str,
    actor: &str,
    message: &NormalizedMessage,
) -> String {
    format!(
        r#"你是企业微信机器人普通用户准入审核器。你的任务只判断一条用户消息是否符合管理员配置的自然语言策略。

管理员配置的普通用户允许范围：
{policy}

发送人 UserID：
{actor}

用户消息：
{}

只输出一个 JSON 对象，不要输出 Markdown、解释或多余文本。格式：
{{"allow":true,"reason":"一句话说明为什么允许或拒绝"}}

判断规则：
- 只判断是否允许进入后续执行，不要执行用户请求。
- 如果用户请求明显落在允许范围内，allow=true。
- 如果用户请求超出范围、含糊到无法判断、要求执行危险操作或读取敏感信息，allow=false。
- reason 要简短，便于直接发回企业微信用户。
"#,
        message.to_prompt()
    )
}

pub fn build_user_policy_prompt(policy: &str, message: &NormalizedMessage) -> String {
    format!(
        "普通用户允许范围:\n{policy}\n\n执行边界: 只处理该范围内的请求，不执行无关、破坏性或敏感信息操作。\n\n用户消息:\n{}",
        message.to_prompt()
    )
}

pub fn parse_admission_decision(raw: &str) -> Result<UserAdmissionDecision, String> {
    let trimmed = raw.trim();
    let json_text = if trimmed.starts_with("```") {
        let without_opening = trimmed.lines().skip(1).collect::<Vec<_>>().join("\n");
        without_opening
            .trim()
            .strip_suffix("```")
            .unwrap_or(without_opening.trim())
            .trim()
            .to_string()
    } else {
        trimmed.to_string()
    };

    let start = json_text
        .find('{')
        .ok_or_else(|| "Admission result did not contain a JSON object.".to_string())?;
    let end = json_text
        .rfind('}')
        .ok_or_else(|| "Admission result did not contain a complete JSON object.".to_string())?;
    if end < start {
        return Err("Admission result JSON object is malformed.".to_string());
    }

    serde_json::from_str::<UserAdmissionDecision>(&json_text[start..=end])
        .map_err(|error| format!("Failed to parse admission decision: {}", error))
}

pub fn peer_id_for_message(message: &WecomIncomingMessage) -> String {
    if message.chattype == "group" {
        message
            .chatid
            .as_ref()
            .filter(|value| !value.trim().is_empty())
            .map(|chatid| format!("group:{chatid}"))
            .unwrap_or_else(|| format!("group:{}", message.from.userid))
    } else {
        format!("single:{}", message.from.userid)
    }
}

fn push_mixed(
    text: &mut String,
    attachments: &mut Vec<NormalizedAttachment>,
    mixed: Option<&MixedContent>,
) {
    let Some(mixed) = mixed else {
        return;
    };
    for item in &mixed.msg_item {
        match item.msgtype.as_str() {
            "text" => {
                if let Some(content) = item
                    .text
                    .as_ref()
                    .map(|v| v.content.trim())
                    .filter(|v| !v.is_empty())
                {
                    if !text.is_empty() {
                        text.push('\n');
                    }
                    text.push_str(content);
                }
            }
            "image" => push_media(attachments, "image", item.image.as_ref()),
            _ => {}
        }
    }
}

fn push_media(
    attachments: &mut Vec<NormalizedAttachment>,
    kind: &str,
    media: Option<&MediaContent>,
) {
    let Some(media) = media else {
        return;
    };
    if !media.url.trim().is_empty() {
        attachments.push(NormalizedAttachment {
            kind: kind.to_string(),
            url: media.url.trim().to_string(),
            aeskey: media
                .aeskey
                .as_ref()
                .map(|key| key.trim().to_string())
                .filter(|key| !key.is_empty()),
            local_path: None,
            error: None,
        });
    }
}

fn format_attachment(attachment: &NormalizedAttachment) -> String {
    let mut parts = vec![format!("- {}", attachment.kind)];
    if let Some(path) = attachment
        .local_path
        .as_ref()
        .filter(|value| !value.trim().is_empty())
    {
        parts.push(format!("local_path={path}"));
    } else {
        parts.push(format!("url={}", attachment.url));
    }
    if attachment.aeskey.is_some() {
        parts.push("encrypted=true".to_string());
    }
    if let Some(error) = attachment.error.as_ref().filter(|value| !value.is_empty()) {
        parts.push(format!("error={error}"));
    }
    parts.join(" ")
}

fn format_quote(quote: &QuoteContent) -> String {
    match quote.msgtype.as_str() {
        "text" => quote
            .text
            .as_ref()
            .map(|v| v.content.clone())
            .unwrap_or_default(),
        "voice" => quote
            .voice
            .as_ref()
            .map(|v| v.content.clone())
            .unwrap_or_default(),
        "image" => {
            let mut attachments = Vec::new();
            push_media(&mut attachments, "quoted image", quote.image.as_ref());
            attachments
                .iter()
                .map(format_attachment)
                .collect::<Vec<_>>()
                .join("\n")
        }
        "mixed" => {
            let mut text = String::new();
            let mut attachments = Vec::new();
            push_mixed(&mut text, &mut attachments, quote.mixed.as_ref());
            [
                text,
                attachments
                    .iter()
                    .map(format_attachment)
                    .collect::<Vec<_>>()
                    .join("\n"),
            ]
            .into_iter()
            .filter(|part| !part.trim().is_empty())
            .collect::<Vec<_>>()
            .join("\n")
        }
        _ => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bot() -> WecomBotConfig {
        WecomBotConfig {
            bot_id: "aibot".to_string(),
            workspace_dir: "/tmp".to_string(),
            admin_user_ids: vec!["admin".to_string()],
            allowed_user_ids: vec!["user".to_string()],
            ..WecomBotConfig::default()
        }
    }

    #[test]
    fn user_admission_prompt_uses_natural_language_policy() {
        let message = NormalizedMessage {
            text: "本周工作内容：完成合同催收项目测试支持".to_string(),
            attachments: Vec::new(),
            quote: None,
        };

        let prompt = build_user_admission_prompt(
            "允许普通用户提交工作内容并生成周报，拒绝其它任务。",
            "iveswen",
            &message,
        );

        assert!(prompt.contains("允许普通用户提交工作内容并生成周报"));
        assert!(prompt.contains("iveswen"));
        assert!(prompt.contains("本周工作内容"));
        assert!(prompt.contains("\"allow\""));
    }

    #[test]
    fn admission_decision_parses_json_result() {
        let decision = parse_admission_decision(
            r#"{"allow":true,"reason":"用户在提交工作内容并请求周报，符合策略"}"#,
        )
        .expect("decision");

        assert!(decision.allow);
        assert!(decision.reason.contains("符合策略"));
    }

    #[test]
    fn admission_decision_parses_fenced_json_result() {
        let decision =
            parse_admission_decision("```json\n{\"allow\":false,\"reason\":\"不是周报任务\"}\n```")
                .expect("decision");

        assert!(!decision.allow);
        assert_eq!(decision.reason, "不是周报任务");
    }

    #[test]
    fn admin_bypasses_allowed_users() {
        let bot = bot();
        assert!(is_actor_allowed(&bot, "admin"));
        assert!(is_actor_allowed(&bot, "user"));
        assert!(!is_actor_allowed(&bot, "stranger"));
    }

    #[test]
    fn mixed_message_extracts_text_and_images() {
        let message = WecomIncomingMessage {
            chatid: None,
            chattype: "single".to_string(),
            from: WecomFrom {
                userid: "u1".to_string(),
            },
            msgtype: "mixed".to_string(),
            text: None,
            image: None,
            voice: None,
            quote: Some(QuoteContent {
                msgtype: "text".to_string(),
                text: Some(TextContent {
                    content: "quoted".to_string(),
                }),
                image: None,
                mixed: None,
                voice: None,
            }),
            mixed: Some(MixedContent {
                msg_item: vec![
                    MixedItem {
                        msgtype: "text".to_string(),
                        text: Some(TextContent {
                            content: "hello".to_string(),
                        }),
                        image: None,
                    },
                    MixedItem {
                        msgtype: "image".to_string(),
                        text: None,
                        image: Some(MediaContent {
                            url: "https://example.com/a.png".to_string(),
                            aeskey: Some("key".to_string()),
                        }),
                    },
                ],
            }),
        };
        let normalized = normalize_message(&message);
        assert_eq!(normalized.text, "hello");
        assert_eq!(normalized.quote.as_deref(), Some("quoted"));
        assert_eq!(normalized.attachments.len(), 1);
        assert_eq!(normalized.attachments[0].kind, "image");
        assert_eq!(normalized.attachments[0].aeskey.as_deref(), Some("key"));
        assert!(normalized.to_prompt().contains("encrypted=true"));
    }
}
