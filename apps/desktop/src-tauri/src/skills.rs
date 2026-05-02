use serde::{Deserialize, Serialize};
use std::io::BufRead;
use std::path::PathBuf;
use std::process::Command;
use std::sync::OnceLock;
use tauri::{AppHandle, Emitter};

use crate::config;

/// Cached user PATH — login shell is expensive on macOS (1-3s),
/// only resolve once per process lifetime.
static USER_PATH: OnceLock<String> = OnceLock::new();

// ============================================
// Types
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstalledSkill {
    pub name: String,
    pub description: String,
    pub path: String,
    pub scope: String,          // "global" | "project" | "plugin"
    pub agents: Vec<String>,    // ["Claude Code", "Codex"]
    pub source: Option<String>, // plugin: marketplace name, skills: "skills.sh"
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CuratedSkill {
    pub name: String,
    pub package_id: String,
    pub skill_name: String,
    pub description: String,
    pub category: String,     // "official" | "popular" | "community"
    pub install_type: String, // "skills" | "plugin"
}

// ============================================
// Helpers
// ============================================

/// Get the user's full PATH from their interactive login shell (cached).
/// macOS GUI apps don't inherit shell PATH, so we need to source it.
/// Uses `-li` (login + interactive) to ensure .zshrc is loaded — needed for
/// nvm, fnm, volta and other version managers that only init in .zshrc.
fn get_user_path() -> &'static str {
    USER_PATH.get_or_init(|| {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        let output = Command::new(&shell)
            .args(["-li", "-c", "echo $PATH"])
            .output();

        match output {
            Ok(out) if out.status.success() => {
                String::from_utf8_lossy(&out.stdout).trim().to_string()
            }
            _ => std::env::var("PATH").unwrap_or_default(),
        }
    })
}

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
fn scan_skills_dir(
    dir: &PathBuf,
    scope: &str,
    agents: &[String],
    source: Option<&str>,
) -> Vec<InstalledSkill> {
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
            let nested = scan_skills_dir(&path, scope, agents, source);
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
                (n.unwrap_or_else(|| dir_name.clone()), d.unwrap_or_default())
            }
            Err(_) => (dir_name.clone(), String::new()),
        };

        skills.push(InstalledSkill {
            name,
            description,
            path: path.to_string_lossy().to_string(),
            scope: scope.to_string(),
            agents: agents.to_vec(),
            source: source.map(|s| s.to_string()),
            version: None,
        });
    }

    skills
}

/// Scan plugin skills from ~/.claude/plugins/
fn scan_plugin_skills() -> Vec<InstalledSkill> {
    let mut skills = Vec::new();
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return skills,
    };

    // Read installed_plugins.json
    let plugins_json = home
        .join(".claude")
        .join("plugins")
        .join("installed_plugins.json");
    let content = match std::fs::read_to_string(&plugins_json) {
        Ok(c) => c,
        Err(_) => return skills,
    };

    // Parse: { "plugins": { "name@marketplace": [{ "scope": "...", "installPath": "...", "version": "..." }] } }
    let parsed: serde_json::Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return skills,
    };

    let plugins = match parsed.get("plugins").and_then(|p| p.as_object()) {
        Some(p) => p,
        None => return skills,
    };

    for (plugin_key, installs) in plugins {
        // Extract marketplace from "name@marketplace"
        let marketplace = plugin_key
            .split('@')
            .nth(1)
            .unwrap_or("unknown")
            .to_string();

        let installs_arr = match installs.as_array() {
            Some(a) => a,
            None => continue,
        };

        for install in installs_arr {
            let install_path = match install.get("installPath").and_then(|p| p.as_str()) {
                Some(p) => PathBuf::from(p),
                None => continue,
            };
            let version = install
                .get("version")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            // Scan installPath/skills/ for SKILL.md subdirectories
            let skills_dir = install_path.join("skills");
            if skills_dir.exists() {
                let mut plugin_skills = scan_skills_dir(
                    &skills_dir,
                    "plugin",
                    &["Claude Code".to_string()],
                    Some(&marketplace),
                );
                // Set version on each skill
                for skill in &mut plugin_skills {
                    skill.version = version.clone();
                }
                skills.extend(plugin_skills);
            }
        }
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

        let user_path = get_user_path();

        let mut cmd = Command::new("claude");
        cmd.args([
            "-p",
            &prompt,
            "--output-format",
            "stream-json",
            "--verbose",
            "--allowedTools",
            "Bash(npx skills find *)",
        ])
        .env("PATH", user_path)
        .env_remove("CLAUDECODE")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

        // Set working directory to avoid running in `/`
        if let Some(dir) = config::get_default_working_dir() {
            cmd.current_dir(&dir);
        } else if let Some(home) = dirs::home_dir() {
            cmd.current_dir(home);
        }

        // Inject AI environment's API config (respects ai_enhanced setting)
        config::inject_ai_env(&mut cmd);

        let child = cmd.spawn();

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

/// List all installed skills from three sources:
/// 1. Filesystem skills: ~/.claude/skills/, ~/.agents/skills/, ~/.codex/skills/
/// 2. Plugin skills: ~/.claude/plugins/installed_plugins.json
/// 3. Project skills: <defaultWorkingDir>/.claude/skills/ (optional)
#[tauri::command]
pub fn list_installed_skills() -> Result<Vec<InstalledSkill>, String> {
    let mut all_skills = Vec::new();

    if let Some(home) = dirs::home_dir() {
        // Source 1: Filesystem skills — scan multiple agent directories
        let claude_agents = ["Claude Code"];
        let codex_agents = ["Codex"];

        // ~/.claude/skills/ → Claude Code
        let claude_skills_dir = home.join(".claude").join("skills");
        if claude_skills_dir.exists() {
            all_skills.extend(scan_skills_dir(
                &claude_skills_dir,
                "global",
                &claude_agents
                    .iter()
                    .map(|s| s.to_string())
                    .collect::<Vec<_>>(),
                Some("skills.sh"),
            ));
        }

        // ~/.agents/skills/ → Claude Code + Codex (shared)
        let agents_skills_dir = home.join(".agents").join("skills");
        if agents_skills_dir.exists() {
            let both_agents = vec!["Claude Code".to_string(), "Codex".to_string()];
            all_skills.extend(scan_skills_dir(
                &agents_skills_dir,
                "global",
                &both_agents,
                Some("skills.sh"),
            ));
        }

        // ~/.codex/skills/ → Codex
        let codex_skills_dir = home.join(".codex").join("skills");
        if codex_skills_dir.exists() {
            all_skills.extend(scan_skills_dir(
                &codex_skills_dir,
                "global",
                &codex_agents
                    .iter()
                    .map(|s| s.to_string())
                    .collect::<Vec<_>>(),
                Some("skills.sh"),
            ));
        }

        // Source 2: Plugin skills
        all_skills.extend(scan_plugin_skills());
    }

    // Source 3: Project skills (if defaultWorkingDir is configured)
    if let Some(working_dir) = config::get_default_working_dir() {
        let project_skills_dir = PathBuf::from(&working_dir).join(".claude").join("skills");
        if project_skills_dir.exists() {
            all_skills.extend(scan_skills_dir(
                &project_skills_dir,
                "project",
                &["Claude Code".to_string()],
                None,
            ));
        }
    }

    Ok(all_skills)
}

/// Return curated skill list for the Discover tab.
#[tauri::command]
pub fn get_curated_skills() -> Vec<CuratedSkill> {
    vec![
        // === Official (anthropics/skills) ===
        CuratedSkill {
            name: "Frontend Design".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "frontend-design".into(),
            description: "Create distinctive, production-grade frontend interfaces with high design quality".into(),
            category: "official".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "Skill Creator".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "skill-creator".into(),
            description: "Create and publish custom skills for Claude Code".into(),
            category: "official".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "Web Artifacts Builder".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "web-artifacts-builder".into(),
            description: "Build interactive web artifacts with HTML/CSS/JS".into(),
            category: "official".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "MCP Builder".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "mcp-builder".into(),
            description: "Build Model Context Protocol servers and tools".into(),
            category: "official".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "WebApp Testing".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "webapp-testing".into(),
            description: "Automated testing for web applications".into(),
            category: "official".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "PDF".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "pdf".into(),
            description: "Read, analyze, and extract data from PDF files".into(),
            category: "official".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "DOCX".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "docx".into(),
            description: "Read and create Word documents".into(),
            category: "official".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "PPTX".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "pptx".into(),
            description: "Create PowerPoint presentations".into(),
            category: "official".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "XLSX".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "xlsx".into(),
            description: "Read and create Excel spreadsheets".into(),
            category: "official".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "Canvas Design".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "canvas-design".into(),
            description: "Create visual designs and graphics using HTML Canvas".into(),
            category: "official".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "Algorithmic Art".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "algorithmic-art".into(),
            description: "Generate algorithmic and generative art".into(),
            category: "official".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "Theme Factory".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "theme-factory".into(),
            description: "Design and create custom themes for applications".into(),
            category: "official".into(),
            install_type: "skills".into(),
        },
        // === Popular (vercel-labs/agent-skills) ===
        CuratedSkill {
            name: "Vercel React Best Practices".into(),
            package_id: "vercel-labs/agent-skills".into(),
            skill_name: "vercel-react-best-practices".into(),
            description: "React and Next.js performance optimization guidelines from Vercel Engineering".into(),
            category: "popular".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "Deploy to Vercel".into(),
            package_id: "vercel-labs/agent-skills".into(),
            skill_name: "deploy-to-vercel".into(),
            description: "Deploy applications to Vercel with best practices".into(),
            category: "popular".into(),
            install_type: "skills".into(),
        },
        CuratedSkill {
            name: "Vercel Composition Patterns".into(),
            package_id: "vercel-labs/agent-skills".into(),
            skill_name: "vercel-composition-patterns".into(),
            description: "Advanced React composition patterns from Vercel".into(),
            category: "popular".into(),
            install_type: "skills".into(),
        },
        // === Community ===
        CuratedSkill {
            name: "Superpowers".into(),
            package_id: "obra/superpowers-marketplace".into(),
            skill_name: "superpowers".into(),
            description: "A marketplace of powerful skills for Claude Code — code review, TDD, debugging, and more".into(),
            category: "community".into(),
            install_type: "plugin".into(),
        },
        CuratedSkill {
            name: "UI/UX Pro Max".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "ui-ux-pro-max".into(),
            description: "Professional UI/UX design intelligence with 50+ styles and component systems".into(),
            category: "community".into(),
            install_type: "plugin".into(),
        },
        CuratedSkill {
            name: "Humanizer ZH".into(),
            package_id: "anthropics/skills".into(),
            skill_name: "Humanizer-zh".into(),
            description: "Remove AI-generated traces from Chinese text, making it sound more natural".into(),
            category: "community".into(),
            install_type: "skills".into(),
        },
    ]
}

/// Install a skill via npx skills add (async, event-driven).
/// Emits "skill-install-done" with { package_id, success, message }.
#[tauri::command]
pub fn install_skill(
    app: AppHandle,
    package_id: String,
    skill_name: Option<String>,
    global: bool,
    agents: Option<Vec<String>>,
) {
    std::thread::spawn(move || {
        let mut args = vec![
            "skills".to_string(),
            "add".to_string(),
            package_id.clone(),
            "-y".to_string(),
        ];

        // Add --skill if provided
        if let Some(ref sn) = skill_name {
            args.push("--skill".to_string());
            args.push(sn.clone());
        }

        if global {
            args.push("-g".to_string());
        }

        // Add --agent flags if agents are specified
        if let Some(ref agent_list) = agents {
            if !agent_list.is_empty() {
                args.push("--agent".to_string());
                for agent in agent_list {
                    // Map display names to CLI names
                    let cli_name = match agent.as_str() {
                        "Claude Code" => "claude-code",
                        "Codex" => "codex",
                        other => other,
                    };
                    args.push(cli_name.to_string());
                }
            }
        }

        let user_path = get_user_path();
        let result = Command::new("npx")
            .args(&args)
            .env("PATH", user_path)
            .output();

        let payload = match result {
            Ok(output) => {
                // npx skills add writes progress/spinners to stderr even on success,
                // so only check exit code — ignore stderr warnings.
                if output.status.success() {
                    serde_json::json!({
                        "package_id": package_id,
                        "success": true,
                        "message": String::from_utf8_lossy(&output.stdout).to_string()
                    })
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                    serde_json::json!({
                        "package_id": package_id,
                        "success": false,
                        "message": if stderr.is_empty() { stdout } else { stderr }
                    })
                }
            }
            Err(e) => {
                serde_json::json!({
                    "package_id": package_id,
                    "success": false,
                    "message": format!("Failed to run npx: {}", e)
                })
            }
        };

        let _ = app.emit("skill-install-done", payload.to_string());
    });
}

/// Uninstall a skill via npx skills remove (async, event-driven).
/// Emits "skill-uninstall-done" with { name, success, message }.
#[tauri::command]
pub fn uninstall_skill(app: AppHandle, name: String, global: bool) {
    std::thread::spawn(move || {
        let mut args = vec![
            "skills".to_string(),
            "remove".to_string(),
            name.clone(),
            "-y".to_string(),
        ];
        if global {
            args.push("-g".to_string());
        }

        let user_path = get_user_path();
        let result = Command::new("npx")
            .args(&args)
            .env("PATH", user_path)
            .output();

        let payload = match result {
            Ok(output) => {
                if output.status.success() {
                    serde_json::json!({
                        "name": name,
                        "success": true,
                        "message": String::from_utf8_lossy(&output.stdout).to_string()
                    })
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                    serde_json::json!({
                        "name": name,
                        "success": false,
                        "message": if stderr.is_empty() { stdout } else { stderr }
                    })
                }
            }
            Err(e) => {
                serde_json::json!({
                    "name": name,
                    "success": false,
                    "message": format!("Failed to run npx: {}", e)
                })
            }
        };

        let _ = app.emit("skill-uninstall-done", payload.to_string());
    });
}

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

        let skills = scan_skills_dir(&dir, "global", &["Claude Code".to_string()], None);
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

        let skills = scan_skills_dir(
            &dir,
            "global",
            &["Claude Code".to_string()],
            Some("skills.sh"),
        );
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "Test Skill");
        assert_eq!(skills[0].description, "A test");
        assert_eq!(skills[0].scope, "global");
        assert_eq!(skills[0].agents, vec!["Claude Code"]);
        assert_eq!(skills[0].source, Some("skills.sh".to_string()));

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_list_installed_skills_ignores_hidden() {
        let dir = std::env::temp_dir().join("ccem-test-skills-hidden");
        let _ = fs::remove_dir_all(&dir);
        let hidden = dir.join(".hidden-skill");
        fs::create_dir_all(&hidden).unwrap();
        fs::write(hidden.join("SKILL.md"), "---\nname: Hidden\n---\n").unwrap();

        let skills = scan_skills_dir(&dir, "global", &["Claude Code".to_string()], None);
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
        fs::write(
            skill_dir.join("SKILL.md"),
            "# Just a title\nNo frontmatter.",
        )
        .unwrap();

        let skills = scan_skills_dir(&dir, "global", &["Claude Code".to_string()], None);
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

        let skills = scan_skills_dir(&dir, "global", &["Claude Code".to_string()], None);
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "Nested Skill");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_get_curated_skills() {
        let curated = get_curated_skills();
        assert!(!curated.is_empty());
        // Check we have all three categories
        assert!(curated.iter().any(|s| s.category == "official"));
        assert!(curated.iter().any(|s| s.category == "popular"));
        assert!(curated.iter().any(|s| s.category == "community"));
    }
}
