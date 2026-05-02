use std::collections::HashMap;
use std::process::Command;

#[derive(Debug, Clone, Default, PartialEq, Eq)]
struct ProxySettings {
    http_proxy: Option<String>,
    https_proxy: Option<String>,
    all_proxy: Option<String>,
    no_proxy: Option<String>,
}

impl ProxySettings {
    fn is_empty(&self) -> bool {
        self.http_proxy.is_none()
            && self.https_proxy.is_none()
            && self.all_proxy.is_none()
            && self.no_proxy.is_none()
    }

    fn into_env_vars(self) -> HashMap<String, String> {
        let mut env_vars = HashMap::new();
        insert_proxy_env(&mut env_vars, "HTTP_PROXY", self.http_proxy);
        insert_proxy_env(&mut env_vars, "HTTPS_PROXY", self.https_proxy);
        insert_proxy_env(&mut env_vars, "ALL_PROXY", self.all_proxy);
        insert_proxy_env(&mut env_vars, "NO_PROXY", self.no_proxy);
        env_vars
    }
}

fn insert_proxy_env(
    env_vars: &mut HashMap<String, String>,
    upper_key: &str,
    value: Option<String>,
) {
    let Some(value) = value.filter(|value| !value.trim().is_empty()) else {
        return;
    };
    env_vars.insert(upper_key.to_string(), value.clone());
    env_vars.insert(upper_key.to_ascii_lowercase(), value);
}

pub fn resolve_codex_proxy_env() -> HashMap<String, String> {
    proxy_settings_from_process_env()
        .or_else(proxy_settings_from_scutil)
        .map(ProxySettings::into_env_vars)
        .unwrap_or_default()
}

fn proxy_settings_from_process_env() -> Option<ProxySettings> {
    let settings = ProxySettings {
        http_proxy: first_env_value(&["HTTP_PROXY", "http_proxy"]),
        https_proxy: first_env_value(&["HTTPS_PROXY", "https_proxy"]),
        all_proxy: first_env_value(&["ALL_PROXY", "all_proxy"]),
        no_proxy: first_env_value(&["NO_PROXY", "no_proxy"]),
    };

    if settings.is_empty() {
        None
    } else {
        Some(settings)
    }
}

fn first_env_value(keys: &[&str]) -> Option<String> {
    keys.iter()
        .find_map(|key| std::env::var(key).ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn proxy_settings_from_scutil() -> Option<ProxySettings> {
    let output = Command::new("scutil").arg("--proxy").output().ok()?;
    if !output.status.success() {
        return None;
    }
    parse_scutil_proxy_output(&String::from_utf8_lossy(&output.stdout))
}

fn parse_scutil_proxy_output(raw: &str) -> Option<ProxySettings> {
    let mut values = HashMap::new();
    let mut exceptions = Vec::new();
    let mut in_exceptions = false;

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed == "<dictionary> {" {
            continue;
        }

        if trimmed.starts_with("ExceptionsList") && trimmed.contains("<array>") {
            in_exceptions = true;
            continue;
        }

        if in_exceptions {
            if trimmed == "}" {
                in_exceptions = false;
                continue;
            }
            if let Some((_, value)) = trimmed.split_once(" : ") {
                exceptions.push(value.trim().to_string());
            }
            continue;
        }

        if trimmed == "}" {
            continue;
        }

        if let Some((key, value)) = trimmed.split_once(" : ") {
            values.insert(key.trim().to_string(), value.trim().to_string());
        }
    }

    let http_proxy = if values.get("HTTPEnable").map(String::as_str) == Some("1") {
        build_http_proxy(values.get("HTTPProxy"), values.get("HTTPPort"))
    } else {
        None
    };

    let https_proxy = if values.get("HTTPSEnable").map(String::as_str) == Some("1") {
        build_http_proxy(values.get("HTTPSProxy"), values.get("HTTPSPort"))
    } else {
        None
    };

    let socks_proxy = if values.get("SOCKSEnable").map(String::as_str) == Some("1") {
        build_socks_proxy(values.get("SOCKSProxy"), values.get("SOCKSPort"))
    } else {
        None
    };

    let mut settings = ProxySettings {
        http_proxy,
        https_proxy,
        all_proxy: socks_proxy.clone(),
        no_proxy: (!exceptions.is_empty()).then(|| exceptions.join(",")),
    };

    if settings.http_proxy.is_none() {
        settings.http_proxy = socks_proxy.clone();
    }
    if settings.https_proxy.is_none() {
        settings.https_proxy = socks_proxy;
    }

    if settings.is_empty() {
        None
    } else {
        Some(settings)
    }
}

fn build_http_proxy(host: Option<&String>, port: Option<&String>) -> Option<String> {
    Some(format!("http://{}:{}", host?.trim(), port?.trim()))
}

fn build_socks_proxy(host: Option<&String>, port: Option<&String>) -> Option<String> {
    Some(format!("socks5://{}:{}", host?.trim(), port?.trim()))
}

#[cfg(test)]
mod tests {
    use super::parse_scutil_proxy_output;

    #[test]
    fn parse_scutil_proxy_output_reads_http_https_socks_and_exceptions() {
        let raw = r#"
<dictionary> {
  HTTPEnable : 1
  HTTPPort : 7890
  HTTPProxy : 127.0.0.1
  HTTPSEnable : 1
  HTTPSPort : 7890
  HTTPSProxy : 127.0.0.1
  SOCKSEnable : 1
  SOCKSPort : 7891
  SOCKSProxy : 127.0.0.1
  ExceptionsList : <array> {
    0 : *.local
    1 : 169.254/16
  }
}
"#;

        let settings = parse_scutil_proxy_output(raw).expect("proxy settings");
        assert_eq!(
            settings.http_proxy.as_deref(),
            Some("http://127.0.0.1:7890")
        );
        assert_eq!(
            settings.https_proxy.as_deref(),
            Some("http://127.0.0.1:7890")
        );
        assert_eq!(
            settings.all_proxy.as_deref(),
            Some("socks5://127.0.0.1:7891")
        );
        assert_eq!(settings.no_proxy.as_deref(), Some("*.local,169.254/16"));
    }

    #[test]
    fn parse_scutil_proxy_output_falls_back_to_socks_for_http_and_https() {
        let raw = r#"
<dictionary> {
  SOCKSEnable : 1
  SOCKSPort : 1080
  SOCKSProxy : 127.0.0.1
}
"#;

        let settings = parse_scutil_proxy_output(raw).expect("proxy settings");
        assert_eq!(
            settings.http_proxy.as_deref(),
            Some("socks5://127.0.0.1:1080")
        );
        assert_eq!(
            settings.https_proxy.as_deref(),
            Some("socks5://127.0.0.1:1080")
        );
        assert_eq!(
            settings.all_proxy.as_deref(),
            Some("socks5://127.0.0.1:1080")
        );
    }
}
