use super::BotBindingInfo;
use crate::config;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

const REQUEST_FILE_NAME: &str = "bot-bind-requests.jsonl";
const STATE_FILE_NAME: &str = "session-bot-bindings.json";

#[derive(Debug, Serialize, Deserialize)]
struct PersistedBotBindings {
    version: u8,
    bindings: Vec<BotBindingInfo>,
}

pub fn bot_binding_request_path() -> PathBuf {
    dirs::home_dir()
        .map(|home| home.join(".ccem").join(REQUEST_FILE_NAME))
        .unwrap_or_else(|| PathBuf::from(".ccem").join(REQUEST_FILE_NAME))
}

pub fn bot_binding_state_path() -> PathBuf {
    config::get_ccem_dir().join(STATE_FILE_NAME)
}

pub fn load_bindings(path: &Path) -> Result<HashMap<String, BotBindingInfo>, String> {
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let content = fs::read_to_string(path)
        .map_err(|error| format!("Failed to read bot binding state: {}", error))?;
    let bindings = serde_json::from_str::<PersistedBotBindings>(&content)
        .map(|state| state.bindings)
        .or_else(|_| serde_json::from_str::<Vec<BotBindingInfo>>(&content))
        .map_err(|error| format!("Failed to parse bot binding state: {}", error))?;

    Ok(bindings
        .into_iter()
        .map(|binding| (binding.binding_id.clone(), binding))
        .collect())
}

pub fn save_bindings(
    path: &Path,
    bindings: &HashMap<String, BotBindingInfo>,
) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create bot binding state dir: {}", error))?;
    }

    let mut items = bindings.values().cloned().collect::<Vec<_>>();
    items.sort_by(|left, right| left.binding_id.cmp(&right.binding_id));
    let state = PersistedBotBindings {
        version: 1,
        bindings: items,
    };
    let content = serde_json::to_string_pretty(&state)
        .map_err(|error| format!("Failed to encode bot binding state: {}", error))?;
    fs::write(path, content)
        .map_err(|error| format!("Failed to write bot binding state: {}", error))
}
