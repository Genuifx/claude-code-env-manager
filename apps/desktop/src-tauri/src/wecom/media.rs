use super::message::{NormalizedAttachment, NormalizedMessage};
use super::types::WecomBotConfig;
use aes::cipher::{block_padding::NoPadding, BlockDecryptMut, KeyIvInit};
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use reqwest::header::{CONTENT_DISPOSITION, CONTENT_TYPE};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

type Aes256CbcDec = cbc::Decryptor<aes::Aes256>;

const WECOM_MEDIA_TIMEOUT_SECS: u64 = 30;
const WECOM_MEDIA_MAX_BYTES: u64 = 25 * 1024 * 1024;

pub fn prepare_message_attachments(
    bot: &WecomBotConfig,
    peer_id: &str,
    request_id: &str,
    message: &mut NormalizedMessage,
) {
    if message.attachments.is_empty() {
        return;
    }

    let base_dir = Path::new(&bot.workspace_dir)
        .join(".ccem")
        .join("wecom-attachments")
        .join(sanitize_path_segment(&bot.bot_id))
        .join(sanitize_path_segment(peer_id))
        .join(sanitize_path_segment(request_id));
    if let Err(error) = fs::create_dir_all(&base_dir) {
        mark_attachment_errors(
            &mut message.attachments,
            format!("failed to create attachment directory: {error}"),
        );
        return;
    }

    let client = match reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(WECOM_MEDIA_TIMEOUT_SECS))
        .build()
    {
        Ok(client) => client,
        Err(error) => {
            mark_attachment_errors(
                &mut message.attachments,
                format!("failed to build attachment client: {error}"),
            );
            return;
        }
    };

    for (index, attachment) in message.attachments.iter_mut().enumerate() {
        if attachment.url.trim().is_empty() || !is_supported_attachment(attachment) {
            continue;
        }
        match download_attachment(&client, &base_dir, index, attachment) {
            Ok(path) => attachment.local_path = Some(path.to_string_lossy().to_string()),
            Err(error) => attachment.error = Some(error),
        }
    }
}

fn download_attachment(
    client: &reqwest::blocking::Client,
    base_dir: &Path,
    index: usize,
    attachment: &NormalizedAttachment,
) -> Result<PathBuf, String> {
    let response = client
        .get(&attachment.url)
        .send()
        .map_err(|error| format!("download failed: {error}"))?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!("download returned HTTP {status}"));
    }
    if response
        .content_length()
        .is_some_and(|bytes| bytes > WECOM_MEDIA_MAX_BYTES)
    {
        return Err(format!(
            "attachment exceeds {} MB",
            WECOM_MEDIA_MAX_BYTES / 1024 / 1024
        ));
    }

    let headers = response.headers().clone();
    let content_type = headers
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    let encrypted = response
        .bytes()
        .map_err(|error| format!("failed to read attachment body: {error}"))?;
    if encrypted.len() as u64 > WECOM_MEDIA_MAX_BYTES {
        return Err(format!(
            "attachment exceeds {} MB",
            WECOM_MEDIA_MAX_BYTES / 1024 / 1024
        ));
    }

    let bytes = if let Some(aeskey) = attachment.aeskey.as_deref() {
        decrypt_media_file(encrypted.as_ref(), aeskey)?
    } else {
        encrypted.to_vec()
    };
    let filename = attachment_filename(
        &headers,
        &attachment.url,
        &content_type,
        attachment.kind.as_str(),
        index,
    );
    let path = unique_path(base_dir, &filename);
    fs::write(&path, bytes).map_err(|error| format!("failed to save attachment: {error}"))?;
    Ok(path)
}

fn decrypt_media_file(encrypted: &[u8], aeskey: &str) -> Result<Vec<u8>, String> {
    if encrypted.is_empty() {
        return Err("encrypted attachment body is empty".to_string());
    }
    let key = BASE64_STANDARD
        .decode(aeskey)
        .map_err(|error| format!("invalid media aeskey: {error}"))?;
    if key.len() != 32 {
        return Err(format!("invalid media aeskey length: {}", key.len()));
    }
    let iv = &key[..16];
    let cipher = Aes256CbcDec::new_from_slices(&key, iv)
        .map_err(|error| format!("invalid AES parameters: {error}"))?;
    let mut buffer = encrypted.to_vec();
    let decrypted = cipher
        .decrypt_padded_mut::<NoPadding>(&mut buffer)
        .map_err(|error| format!("media decrypt failed: {error}"))?;
    let Some(&pad_len) = decrypted.last() else {
        return Err("decrypted attachment body is empty".to_string());
    };
    let pad_len = pad_len as usize;
    if pad_len == 0 || pad_len > 32 || pad_len > decrypted.len() {
        return Err(format!("invalid PKCS#7 padding value: {pad_len}"));
    }
    if !decrypted[decrypted.len() - pad_len..]
        .iter()
        .all(|byte| *byte as usize == pad_len)
    {
        return Err("invalid PKCS#7 padding bytes".to_string());
    }
    Ok(decrypted[..decrypted.len() - pad_len].to_vec())
}

fn is_supported_attachment(attachment: &NormalizedAttachment) -> bool {
    matches!(attachment.kind.as_str(), "image" | "quoted image")
}

fn mark_attachment_errors(attachments: &mut [NormalizedAttachment], error: String) {
    for attachment in attachments {
        if is_supported_attachment(attachment) {
            attachment.error = Some(error.clone());
        }
    }
}

fn attachment_filename(
    headers: &reqwest::header::HeaderMap,
    url: &str,
    content_type: &str,
    kind: &str,
    index: usize,
) -> String {
    let candidate = headers
        .get(CONTENT_DISPOSITION)
        .and_then(|value| value.to_str().ok())
        .and_then(filename_from_content_disposition)
        .or_else(|| filename_from_url(url))
        .unwrap_or_else(|| {
            format!(
                "{kind}_{index}.{}",
                extension_from_content_type(content_type)
            )
        });
    let sanitized = sanitize_filename(&candidate);
    if Path::new(&sanitized).extension().is_some() {
        sanitized
    } else {
        format!("{sanitized}.{}", extension_from_content_type(content_type))
    }
}

fn filename_from_content_disposition(value: &str) -> Option<String> {
    for part in value.split(';').map(str::trim) {
        let lower = part.to_ascii_lowercase();
        if lower.starts_with("filename*=") {
            let raw = part.split_once('=')?.1.trim().trim_matches('"');
            let filename = raw
                .strip_prefix("UTF-8''")
                .or_else(|| raw.strip_prefix("utf-8''"))
                .unwrap_or(raw);
            return Some(percent_decode(filename));
        }
        if lower.starts_with("filename=") {
            return part
                .split_once('=')
                .map(|(_, filename)| percent_decode(filename.trim().trim_matches('"')));
        }
    }
    None
}

fn filename_from_url(url: &str) -> Option<String> {
    let parsed = reqwest::Url::parse(url).ok()?;
    parsed
        .path_segments()?
        .next_back()
        .map(str::trim)
        .filter(|segment| !segment.is_empty())
        .map(percent_decode)
}

fn extension_from_content_type(content_type: &str) -> &'static str {
    match content_type.split(';').next().unwrap_or_default().trim() {
        "image/jpeg" | "image/jpg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "bin",
    }
}

fn unique_path(base_dir: &Path, filename: &str) -> PathBuf {
    let mut path = base_dir.join(filename);
    if !path.exists() {
        return path;
    }

    let file_stem = Path::new(filename)
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("attachment");
    let extension = Path::new(filename)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    for suffix in 1..1000 {
        let candidate = if extension.is_empty() {
            format!("{file_stem}-{suffix}")
        } else {
            format!("{file_stem}-{suffix}.{extension}")
        };
        path = base_dir.join(candidate);
        if !path.exists() {
            return path;
        }
    }
    base_dir.join(format!("{file_stem}-overflow"))
}

fn sanitize_path_segment(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | '-') {
                ch
            } else {
                '_'
            }
        })
        .collect::<String>();
    sanitized.trim_matches('_').chars().take(80).collect()
}

fn sanitize_filename(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | '-') {
                ch
            } else {
                '_'
            }
        })
        .collect::<String>();
    let trimmed = sanitized
        .trim_matches(['.', '_'])
        .chars()
        .take(120)
        .collect::<String>();
    if trimmed.is_empty() {
        "attachment.bin".to_string()
    } else {
        trimmed
    }
}

fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            if let Ok(byte) = u8::from_str_radix(&value[index + 1..index + 3], 16) {
                decoded.push(byte);
                index += 3;
                continue;
            }
        }
        decoded.push(bytes[index]);
        index += 1;
    }
    String::from_utf8(decoded).unwrap_or_else(|_| value.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use aes::cipher::{BlockEncryptMut, KeyIvInit};
    type Aes256CbcEnc = cbc::Encryptor<aes::Aes256>;

    #[test]
    fn decrypt_media_file_removes_wecom_padding() {
        let key = [7_u8; 32];
        let iv = &key[..16];
        let plaintext = b"hello image";
        let pad_len = 32 - (plaintext.len() % 32);
        let mut padded = plaintext.to_vec();
        padded.extend(std::iter::repeat_n(pad_len as u8, pad_len));
        let cipher = Aes256CbcEnc::new_from_slices(&key, iv).unwrap();
        let len = padded.len();
        let encrypted = cipher
            .encrypt_padded_mut::<NoPadding>(&mut padded, len)
            .unwrap()
            .to_vec();

        let aeskey = BASE64_STANDARD.encode(key);
        let decrypted = decrypt_media_file(&encrypted, &aeskey).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn content_disposition_prefers_utf8_filename() {
        assert_eq!(
            filename_from_content_disposition("attachment; filename*=UTF-8''weekly%20image.png")
                .as_deref(),
            Some("weekly image.png")
        );
    }

    #[test]
    fn sanitize_filename_keeps_extension() {
        assert_eq!(sanitize_filename("../a b.png"), "a_b.png");
    }
}
