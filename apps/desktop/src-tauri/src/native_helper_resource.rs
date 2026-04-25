use std::path::PathBuf;

use tauri::{path::BaseDirectory, AppHandle, Manager};

const NATIVE_HELPER_RESOURCE_PATHS: [&str; 2] = [
    "resources/native-runtime-helper.mjs",
    "native-runtime-helper.mjs",
];

pub fn native_helper_script_path(app: &AppHandle) -> Result<PathBuf, String> {
    let source_path = source_native_helper_script_path();
    let mut resource_paths = Vec::new();
    let mut resolve_errors = Vec::new();

    for relative_path in NATIVE_HELPER_RESOURCE_PATHS {
        match app.path().resolve(relative_path, BaseDirectory::Resource) {
            Ok(path) => resource_paths.push(path),
            Err(error) => resolve_errors.push(format!("{} ({})", relative_path, error)),
        }
    }

    let candidates =
        native_helper_candidate_paths(source_path.clone(), resource_paths, cfg!(debug_assertions));

    if let Some(path) = first_existing_candidate(&candidates) {
        return Ok(path);
    }

    let mut attempted = candidates
        .iter()
        .map(|path| path.display().to_string())
        .collect::<Vec<_>>();

    if !cfg!(debug_assertions) {
        attempted.push(format!(
            "{} (source fallback disabled in release builds)",
            source_path.display()
        ));
    }

    let mut message = format!(
        "Native runtime helper resource was not found. Tried: {}",
        attempted.join(", ")
    );
    if !resolve_errors.is_empty() {
        message.push_str(&format!(
            ". Resource resolution errors: {}",
            resolve_errors.join(", ")
        ));
    }

    Err(message)
}

fn source_native_helper_script_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("native-runtime-helper.mjs")
}

fn native_helper_candidate_paths(
    source_path: PathBuf,
    resource_paths: Vec<PathBuf>,
    include_source_path: bool,
) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if include_source_path {
        candidates.push(source_path);
    }
    candidates.extend(resource_paths);
    candidates
}

fn first_existing_candidate(candidates: &[PathBuf]) -> Option<PathBuf> {
    candidates.iter().find(|path| path.exists()).cloned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn production_candidates_prefer_bundled_resources_over_source_path() {
        let source =
            PathBuf::from("/repo/apps/desktop/src-tauri/resources/native-runtime-helper.mjs");
        let bundled = vec![
            PathBuf::from("/app/Contents/Resources/resources/native-runtime-helper.mjs"),
            PathBuf::from("/app/Contents/Resources/native-runtime-helper.mjs"),
        ];

        assert_eq!(
            native_helper_candidate_paths(source.clone(), bundled.clone(), false),
            bundled
        );
        assert_eq!(
            native_helper_candidate_paths(source.clone(), bundled.clone(), true),
            vec![source, bundled[0].clone(), bundled[1].clone()]
        );
    }

    #[test]
    fn first_existing_candidate_returns_the_first_present_path() {
        let root = std::env::temp_dir().join(format!(
            "ccem-native-helper-path-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock should be after unix epoch")
                .as_nanos()
        ));
        let missing = root.join("missing.mjs");
        let existing = root.join("resources").join("native-runtime-helper.mjs");

        fs::create_dir_all(existing.parent().expect("test path should have parent"))
            .expect("create temp resource directory");
        fs::write(&existing, b"").expect("write temp resource");

        assert_eq!(
            first_existing_candidate(&[missing, existing.clone()]),
            Some(existing.clone())
        );

        fs::remove_dir_all(root).expect("remove temp resource directory");
    }
}
