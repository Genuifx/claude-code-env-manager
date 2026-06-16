use base64::{engine::general_purpose::STANDARD, Engine as _};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredPromptImage {
    pub media_type: String,
    pub sha256: String,
    pub byte_size: u64,
    pub storage_path: String,
}

#[derive(Debug, Clone)]
pub struct PromptImageStore {
    root: PathBuf,
}

impl Default for PromptImageStore {
    fn default() -> Self {
        Self::new(default_prompt_image_store_dir())
    }
}

impl PromptImageStore {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    pub fn store_base64_image(
        &self,
        media_type: &str,
        base64_data: &str,
    ) -> Result<StoredPromptImage, String> {
        let media_type = normalize_image_media_type(media_type)?;
        let bytes = STANDARD
            .decode(base64_data.trim())
            .map_err(|error| format!("Failed to decode prompt image: {}", error))?;
        if bytes.is_empty() {
            return Err("Prompt image is empty".to_string());
        }

        let sha256 = hex::encode(Sha256::digest(&bytes));
        let file_name = format!("{}.{}", sha256, extension_for_media_type(&media_type));
        let target_path = self.root.join(&file_name);

        fs::create_dir_all(&self.root)
            .map_err(|error| format!("Failed to create prompt image store: {}", error))?;
        if !target_path.exists() {
            let temp_path = self
                .root
                .join(format!(".{}.{}.tmp", sha256, std::process::id()));
            fs::write(&temp_path, &bytes)
                .map_err(|error| format!("Failed to write prompt image: {}", error))?;
            if let Err(error) = fs::rename(&temp_path, &target_path) {
                if target_path.exists() {
                    let _ = fs::remove_file(&temp_path);
                } else {
                    let _ = fs::remove_file(&temp_path);
                    return Err(format!("Failed to finalize prompt image: {}", error));
                }
            }
        }

        Ok(StoredPromptImage {
            media_type,
            sha256,
            byte_size: bytes.len() as u64,
            storage_path: file_name,
        })
    }

    pub fn read_data_url(&self, storage_path: &str, media_type: &str) -> Result<String, String> {
        let media_type = normalize_image_media_type(media_type)?;
        let path = self.resolve_storage_path(storage_path)?;
        let bytes = fs::read(&path).map_err(|error| {
            format!(
                "Failed to read prompt image attachment {}: {}",
                path.display(),
                error
            )
        })?;
        let encoded = STANDARD.encode(bytes);
        Ok(format!("data:{};base64,{}", media_type, encoded))
    }

    fn resolve_storage_path(&self, storage_path: &str) -> Result<PathBuf, String> {
        let trimmed = storage_path.trim();
        if trimmed.is_empty() {
            return Err("Missing prompt image storage path".to_string());
        }

        let relative = Path::new(trimmed);
        if relative.is_absolute()
            || relative
                .components()
                .any(|component| !matches!(component, Component::Normal(_)))
        {
            return Err("Invalid prompt image storage path".to_string());
        }

        let root = self.root.canonicalize().map_err(|error| {
            format!(
                "Failed to resolve prompt image store {}: {}",
                self.root.display(),
                error
            )
        })?;
        let full_path = self
            .root
            .join(relative)
            .canonicalize()
            .map_err(|error| format!("Failed to resolve prompt image attachment: {}", error))?;
        if !full_path.starts_with(&root) {
            return Err("Prompt image storage path escaped attachment store".to_string());
        }

        Ok(full_path)
    }
}

pub fn default_prompt_image_store_dir() -> PathBuf {
    dirs::home_dir()
        .map(|home| home.join(".ccem").join("attachments").join("prompt-images"))
        .unwrap_or_else(|| {
            PathBuf::from(".ccem")
                .join("attachments")
                .join("prompt-images")
        })
}

fn normalize_image_media_type(media_type: &str) -> Result<String, String> {
    let media_type = media_type
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    if !media_type.starts_with("image/") {
        return Err("Prompt attachment is not an image".to_string());
    }
    Ok(media_type)
}

fn extension_for_media_type(media_type: &str) -> &'static str {
    match media_type {
        "image/png" => "png",
        "image/jpeg" | "image/jpg" => "jpg",
        "image/gif" => "gif",
        "image/webp" => "webp",
        "image/bmp" => "bmp",
        "image/svg+xml" => "svg",
        "image/tiff" => "tiff",
        "image/heic" => "heic",
        _ => "bin",
    }
}

#[cfg(test)]
mod tests {
    use super::PromptImageStore;
    use std::fs;

    #[test]
    fn stores_prompt_images_by_content_hash() {
        let root = std::env::temp_dir().join(format!(
            "ccem-prompt-image-store-test-{}",
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        let store = PromptImageStore::new(root.clone());

        let first = store
            .store_base64_image("image/png", "aGVsbG8=")
            .expect("store image");
        let second = store
            .store_base64_image("image/png", "aGVsbG8=")
            .expect("dedupe image");

        assert_eq!(first, second);
        assert_eq!(first.byte_size, 5);
        assert!(first.storage_path.ends_with(".png"));
        assert!(root.join(first.storage_path).exists());

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn reads_prompt_images_as_data_urls() {
        let root = std::env::temp_dir().join(format!(
            "ccem-prompt-image-read-test-{}",
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        let store = PromptImageStore::new(root.clone());

        let stored = store
            .store_base64_image("image/png", "aGVsbG8=")
            .expect("store image");
        let data_url = store
            .read_data_url(&stored.storage_path, &stored.media_type)
            .expect("read image");

        assert_eq!(data_url, "data:image/png;base64,aGVsbG8=");

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_paths_outside_attachment_store() {
        let root = std::env::temp_dir().join(format!(
            "ccem-prompt-image-path-test-{}",
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        let store = PromptImageStore::new(root.clone());
        let stored = store
            .store_base64_image("image/png", "aGVsbG8=")
            .expect("store image");

        assert!(store
            .read_data_url("../outside.png", &stored.media_type)
            .is_err());
        assert!(store
            .read_data_url("/tmp/outside.png", &stored.media_type)
            .is_err());

        let _ = fs::remove_dir_all(root);
    }
}
