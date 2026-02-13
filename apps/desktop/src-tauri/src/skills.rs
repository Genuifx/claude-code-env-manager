use serde::{Deserialize, Serialize};
use std::io::BufRead;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Emitter};

// ============================================
// Types
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstalledSkill {
    pub name: String,
    pub description: String,
    pub path: String,
    pub scope: String, // "global" | "project"
}

// ============================================
// Helpers
// ============================================

/// Parse YAML frontmatter from SKILL.md content.
/// Returns (name, description) if frontmatter exists.
fn parse_skill_frontmatter(content: &str) -> (Option<String>, Option<String>) {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return (None, None);
    }

    // Find the closing ---
    let after_first = &trimmed[3..];
    let end = match after_first.find("---") {
        Some(pos) => pos,
        None => return (None, None),
    };

    let frontmatter = &after_first[..end];
    let mut name = None;
    let mut description = None;

    for line in frontmatter.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("name:") {
            name = Some(val.trim().trim_matches('"').trim_matches('\'').to_string());
        } else if let Some(val) = line.strip_prefix("description:") {
            description = Some(val.trim().trim_matches('"').trim_matches('\'').to_string());
        }
    }

    (name, description)
}

/// Scan a directory for skills (each subdirectory with SKILL.md).
fn scan_skills_dir(dir: &PathBuf, scope: &str) -> Vec<InstalledSkill> {
    let mut skills = Vec::new();

    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return skills,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        // Skip hidden directories
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') {
                continue;
            }
        }

        let skill_md = path.join("SKILL.md");
        if !skill_md.exists() {
            // Check for nested skills (multi-skill pack)
            let nested = scan_skills_dir(&path, scope);
            skills.extend(nested);
            continue;
        }

        let dir_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let (name, description) = match std::fs::read_to_string(&skill_md) {
            Ok(content) => {
                let (n, d) = parse_skill_frontmatter(&content);
                (
                    n.unwrap_or_else(|| dir_name.clone()),
                    d.unwrap_or_default(),
                )
            }
            Err(_) => (dir_name.clone(), String::new()),
        };

        skills.push(InstalledSkill {
            name,
            description,
            path: path.to_string_lossy().to_string(),
            scope: scope.to_string(),
        });
    }

    skills
}

// ============================================
// Tauri Commands
// ============================================

/// Stream skill search results via Claude CLI subprocess.
/// Emits "skill-search-stream" events for each line, then "skill-search-done".
#[tauri::command]
pub fn search_skills_stream(app: AppHandle, query: String) {
    std::thread::spawn(move || {
        let prompt = format!(
            "用户想找: {}，请用 npx skills find 搜索并以 JSON 返回推荐，JSON 格式为 [{{\"name\": \"...\", \"package_id\": \"...\", \"description\": \"...\", \"source\": \"skills.sh\"}}]",
            query
        );

        let child = Command::new("claude")
            .args([
                "-p",
                &prompt,
                "--output-format",
                "stream-json",
                "--verbose",
                "--allowedTools",
                "Bash(npx skills find *)",
            ])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn();

        match child {
            Ok(mut process) => {
                if let Some(stdout) = process.stdout.take() {
                    let reader = std::io::BufReader::new(stdout);
                    for line in reader.lines() {
                        match line {
                            Ok(l) if !l.trim().is_empty() => {
                                let _ = app.emit("skill-search-stream", &l);
                            }
                            _ => {}
                        }
                    }
                }
                let _ = process.wait();
                let _ = app.emit("skill-search-done", ());
            }
            Err(e) => {
                let _ = app.emit(
                    "skill-search-stream",
                    &serde_json::json!({
                        "type": "error",
                        "error": format!("Failed to start claude CLI: {}", e)
                    })
                    .to_string(),
                );
                let _ = app.emit("skill-search-done", ());
            }
        }
    });
}

/// List all installed skills from ~/.claude/skills/ (global).
#[tauri::command]
pub fn list_installed_skills() -> Result<Vec<InstalledSkill>, String> {
    let mut all_skills = Vec::new();

    // Global skills: ~/.claude/skills/
    if let Some(home) = dirs::home_dir() {
        let global_dir = home.join(".claude").join("skills");
        if global_dir.exists() {
            all_skills.extend(scan_skills_dir(&global_dir, "global"));
        }
    }

    Ok(all_skills)
}

/// Install a skill via npx skills add.
#[tauri::command]
pub fn install_skill(package_id: String, global: bool) -> Result<String, String> {
    let mut args = vec!["skills", "add", &package_id, "-y"];
    if global {
        args.push("-g");
    }

    let output = Command::new("npx")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run npx: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// Uninstall a skill via npx skills remove.
#[tauri::command]
pub fn uninstall_skill(name: String, global: bool) -> Result<String, String> {
    let mut args = vec!["skills", "remove", &name, "-y"];
    if global {
        args.push("-g");
    }

    let output = Command::new("npx")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run npx: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// ============================================
// Tests
// ============================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_parse_skill_frontmatter_with_data() {
        let content = r#"---
name: my-skill
description: A cool skill
---
# My Skill
Some content here.
"#;
        let (name, desc) = parse_skill_frontmatter(content);
        assert_eq!(name, Some("my-skill".to_string()));
        assert_eq!(desc, Some("A cool skill".to_string()));
    }

    #[test]
    fn test_parse_skill_frontmatter_quoted() {
        let content = "---\nname: \"quoted-name\"\ndescription: 'single quoted'\n---\n";
        let (name, desc) = parse_skill_frontmatter(content);
        assert_eq!(name, Some("quoted-name".to_string()));
        assert_eq!(desc, Some("single quoted".to_string()));
    }

    #[test]
    fn test_parse_skill_frontmatter_no_frontmatter() {
        let content = "# Just a markdown file\nNo frontmatter here.";
        let (name, desc) = parse_skill_frontmatter(content);
        assert_eq!(name, None);
        assert_eq!(desc, None);
    }

    #[test]
    fn test_parse_skill_frontmatter_empty() {
        let (name, desc) = parse_skill_frontmatter("");
        assert_eq!(name, None);
        assert_eq!(desc, None);
    }

    #[test]
    fn test_parse_skill_frontmatter_unclosed() {
        let content = "---\nname: broken\n";
        let (name, desc) = parse_skill_frontmatter(content);
        assert_eq!(name, None);
        assert_eq!(desc, None);
    }

    #[test]
    fn test_list_installed_skills_empty() {
        let dir = std::env::temp_dir().join("ccem-test-skills-empty");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        let skills = scan_skills_dir(&dir, "global");
        assert!(skills.is_empty());

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_list_installed_skills_with_skills() {
        let dir = std::env::temp_dir().join("ccem-test-skills-with");
        let _ = fs::remove_dir_all(&dir);
        let skill_dir = dir.join("test-skill");
        fs::create_dir_all(&skill_dir).unwrap();
        fs::write(
            skill_dir.join("SKILL.md"),
            "---\nname: Test Skill\ndescription: A test\n---\n# Test",
        )
        .unwrap();

        let skills = scan_skills_dir(&dir, "global");
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "Test Skill");
        assert_eq!(skills[0].description, "A test");
        assert_eq!(skills[0].scope, "global");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_list_installed_skills_ignores_hidden() {
        let dir = std::env::temp_dir().join("ccem-test-skills-hidden");
        let _ = fs::remove_dir_all(&dir);
        let hidden = dir.join(".hidden-skill");
        fs::create_dir_all(&hidden).unwrap();
        fs::write(hidden.join("SKILL.md"), "---\nname: Hidden\n---\n").unwrap();

        let skills = scan_skills_dir(&dir, "global");
        assert!(skills.is_empty());

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_list_installed_skills_fallback_dirname() {
        let dir = std::env::temp_dir().join("ccem-test-skills-fallback");
        let _ = fs::remove_dir_all(&dir);
        let skill_dir = dir.join("my-cool-skill");
        fs::create_dir_all(&skill_dir).unwrap();
        // SKILL.md without frontmatter
        fs::write(skill_dir.join("SKILL.md"), "# Just a title\nNo frontmatter.").unwrap();

        let skills = scan_skills_dir(&dir, "global");
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "my-cool-skill");
        assert_eq!(skills[0].description, "");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_list_installed_skills_nested() {
        let dir = std::env::temp_dir().join("ccem-test-skills-nested");
        let _ = fs::remove_dir_all(&dir);
        // Pack directory without SKILL.md, containing nested skills
        let pack = dir.join("skill-pack");
        let nested = pack.join("sub-skill");
        fs::create_dir_all(&nested).unwrap();
        fs::write(
            nested.join("SKILL.md"),
            "---\nname: Nested Skill\ndescription: Inside a pack\n---\n",
        )
        .unwrap();

        let skills = scan_skills_dir(&dir, "global");
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "Nested Skill");

        let _ = fs::remove_dir_all(&dir);
    }
}
