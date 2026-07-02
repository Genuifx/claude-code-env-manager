use chrono::Utc;
use serde_json::{json, Value};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

fn log_path() -> PathBuf {
    dirs::home_dir()
        .map(|home| home.join(".ccem/desktop-session-launch.log"))
        .unwrap_or_else(|| PathBuf::from(".ccem/desktop-session-launch.log"))
}

pub fn append_session_launch_event(event: &str, details: Value) {
    let path = log_path();
    if let Some(parent) = path.parent() {
        if let Err(error) = std::fs::create_dir_all(parent) {
            eprintln!("Failed to create desktop session launch log dir: {}", error);
            return;
        }
    }

    let record = json!({
        "ts": Utc::now().to_rfc3339(),
        "event": event,
        "details": details,
    });
    let line = match serde_json::to_string(&record) {
        Ok(line) => line,
        Err(error) => {
            eprintln!("Failed to serialize desktop session launch log: {}", error);
            return;
        }
    };

    match OpenOptions::new().create(true).append(true).open(&path) {
        Ok(mut file) => {
            if let Err(error) = writeln!(file, "{}", line) {
                eprintln!("Failed to write desktop session launch log: {}", error);
            }
        }
        Err(error) => eprintln!("Failed to open desktop session launch log: {}", error),
    }
}

pub fn launch_log_path() -> PathBuf {
    log_path()
}
