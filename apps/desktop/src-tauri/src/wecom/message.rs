use super::types::{WecomBotConfig, DEFAULT_ALLOWED_INTENT};
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

pub fn detect_intent(text: &str) -> Option<String> {
    let lower = text.to_ascii_lowercase();
    (text.contains("周报") || lower.contains("weekly report") || lower.contains("week report"))
        .then(|| DEFAULT_ALLOWED_INTENT.to_string())
}

pub fn build_restricted_prompt(intent: &str, message: &NormalizedMessage) -> String {
    format!(
        "普通用户任务意图: {intent}\n权限边界: 只处理该意图相关工作，不执行无关操作或破坏性改动。\n\n用户消息:\n{}",
        message.to_prompt()
    )
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
    fn ordinary_users_are_limited_to_weekly_report_intent() {
        assert_eq!(
            detect_intent("帮我生成本周周报").as_deref(),
            Some("weekly_report")
        );
        assert_eq!(detect_intent("delete everything"), None);
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
