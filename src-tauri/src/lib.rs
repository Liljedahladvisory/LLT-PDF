use base64::{engine::general_purpose::URL_SAFE, Engine};
use chrono::NaiveDate;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::command;

type HmacSha256 = Hmac<Sha256>;

// Samma HMAC-hemlighet som Meeting Recorder LLT
const LICENSE_HMAC_SECRET: &[u8] = &[
    0xac, 0x27, 0x4e, 0xbf, 0x4f, 0x3a, 0x4d, 0xf6, 0x9f, 0xfc, 0x72, 0x88, 0x83, 0x28, 0xd9,
    0xa7, 0x17, 0xb6, 0x7f, 0x5f, 0x59, 0x35, 0x99, 0x80, 0x4c, 0xe8, 0xbd, 0x01, 0x08, 0x3b,
    0xc1, 0x50,
];

fn license_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".llt-pdf")
}

fn license_path() -> PathBuf {
    license_dir().join("license.json")
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicensePayload {
    pub company: String,
    pub created: String,
    pub email: String,
    pub expires: String,
    #[serde(default)]
    pub trial: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseFile {
    pub key: String,
    pub machine_id: String,
    pub activated: String,
    pub company: String,
    pub email: String,
    pub expires: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseStatus {
    pub valid: bool,
    pub message: String,
    pub email: Option<String>,
    pub expires: Option<String>,
    pub company: Option<String>,
}

fn get_machine_id_internal() -> String {
    // macOS: ioreg hardware UUID
    if cfg!(target_os = "macos") {
        if let Ok(output) = Command::new("ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.contains("IOPlatformUUID") {
                    if let Some(uuid) = line.split('"').nth_back(1) {
                        use sha2::Digest;
                        let hash = sha2::Sha256::digest(uuid.as_bytes());
                        return hex::encode(&hash[..16]);
                    }
                }
            }
        }
    }
    // Fallback
    "unknown-machine".to_string()
}

fn verify_license_internal(key_str: &str) -> Option<LicensePayload> {
    // Strip prefix and separators
    let mut raw = key_str
        .trim()
        .replace('\n', "")
        .replace('\r', "")
        .replace(' ', "");
    if raw.to_uppercase().starts_with("LLT.") {
        raw = raw[4..].to_string();
    }
    raw = raw.replace('.', "");

    // Add base64 padding
    let pad = 4 - (raw.len() % 4);
    if pad != 4 {
        raw.push_str(&"=".repeat(pad));
    }

    let combined = URL_SAFE.decode(&raw).ok()?;

    // Format: payload_bytes + b"|" + hmac_digest(32 bytes)
    if combined.len() < 34 {
        return None;
    }
    let sig = &combined[combined.len() - 32..];
    if combined[combined.len() - 33] != b'|' {
        return None;
    }
    let payload_bytes = &combined[..combined.len() - 33];

    // Verify HMAC
    let mut mac = HmacSha256::new_from_slice(LICENSE_HMAC_SECRET).ok()?;
    mac.update(payload_bytes);
    mac.verify_slice(sig).ok()?;

    serde_json::from_slice(payload_bytes).ok()
}

#[command]
fn get_machine_id() -> String {
    get_machine_id_internal()
}

#[command]
fn check_license() -> LicenseStatus {
    let path = license_path();
    if !path.exists() {
        return LicenseStatus {
            valid: false,
            message: "Ingen licens hittad.".into(),
            email: None,
            expires: None,
            company: None,
        };
    }

    let data: LicenseFile = match fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
    {
        Some(d) => d,
        None => {
            return LicenseStatus {
                valid: false,
                message: "Kunde inte lasa licensfil.".into(),
                email: None,
                expires: None,
                company: None,
            }
        }
    };

    // Verify HMAC signature
    let payload = match verify_license_internal(&data.key) {
        Some(p) => p,
        None => {
            return LicenseStatus {
                valid: false,
                message: "Ogiltig licensnyckel.".into(),
                email: None,
                expires: None,
                company: None,
            }
        }
    };

    // Check machine binding
    let current_machine = get_machine_id_internal();
    if !data.machine_id.is_empty() && data.machine_id != current_machine {
        return LicenseStatus {
            valid: false,
            message: "Licensen ar registrerad pa en annan dator.".into(),
            email: Some(payload.email),
            expires: Some(payload.expires),
            company: Some(payload.company),
        };
    }

    // Check expiry
    let today = chrono::Local::now().date_naive();
    if let Ok(exp_date) = NaiveDate::parse_from_str(&payload.expires, "%Y-%m-%d") {
        if exp_date < today {
            return LicenseStatus {
                valid: false,
                message: format!(
                    "Licensen gick ut {}. Kontakta Liljedahl Legal Tech for fornyelse.",
                    payload.expires
                ),
                email: Some(payload.email),
                expires: Some(payload.expires),
                company: Some(payload.company),
            };
        }
    }

    LicenseStatus {
        valid: true,
        message: "ok".into(),
        email: Some(payload.email),
        expires: Some(payload.expires),
        company: Some(payload.company),
    }
}

#[command]
fn activate_license(key: String) -> LicenseStatus {
    let payload = match verify_license_internal(&key) {
        Some(p) => p,
        None => {
            return LicenseStatus {
                valid: false,
                message: "Ogiltig licensnyckel. Kontrollera att du kopierat hela nyckeln.".into(),
                email: None,
                expires: None,
                company: None,
            }
        }
    };

    // Check expiry
    let today = chrono::Local::now().date_naive();
    if let Ok(exp_date) = NaiveDate::parse_from_str(&payload.expires, "%Y-%m-%d") {
        if exp_date < today {
            return LicenseStatus {
                valid: false,
                message: format!("Licensnyckeln har redan gatt ut ({}).", payload.expires),
                email: None,
                expires: None,
                company: None,
            };
        }
    }

    // Save with machine binding
    let dir = license_dir();
    let _ = fs::create_dir_all(&dir);

    let license_data = LicenseFile {
        key: key.trim().to_string(),
        machine_id: get_machine_id_internal(),
        activated: today.to_string(),
        company: payload.company.clone(),
        email: payload.email.clone(),
        expires: payload.expires.clone(),
    };

    match serde_json::to_string_pretty(&license_data) {
        Ok(json) => {
            if let Err(e) = fs::write(license_path(), json) {
                return LicenseStatus {
                    valid: false,
                    message: format!("Kunde inte spara licensfil: {}", e),
                    email: None,
                    expires: None,
                    company: None,
                };
            }
        }
        Err(e) => {
            return LicenseStatus {
                valid: false,
                message: format!("Serialiseringsfel: {}", e),
                email: None,
                expires: None,
                company: None,
            }
        }
    }

    LicenseStatus {
        valid: true,
        message: format!("Licensen ar aktiverad! Galler till {}.", payload.expires),
        email: Some(payload.email),
        expires: Some(payload.expires),
        company: Some(payload.company),
    }
}

#[command]
fn generate_trial_key(name: String, email: String, company: String, days: u32) -> String {
    let today = chrono::Local::now().date_naive();
    let expires = today + chrono::Duration::days(days as i64);

    let payload = serde_json::json!({
        "company": if company.is_empty() { &name } else { &company },
        "created": today.to_string(),
        "email": email,
        "expires": expires.to_string(),
        "trial": true,
    });

    let payload_json = serde_json::to_string(&payload).unwrap_or_default();
    // Deterministic JSON (sorted keys, no spaces)
    let payload_bytes = payload_json.as_bytes();

    let mut mac = HmacSha256::new_from_slice(LICENSE_HMAC_SECRET).unwrap();
    mac.update(payload_bytes);
    let sig = mac.finalize().into_bytes();

    let mut combined = Vec::new();
    combined.extend_from_slice(payload_bytes);
    combined.push(b'|');
    combined.extend_from_slice(&sig);

    let key_b64 = URL_SAFE.encode(&combined);
    let chunks: Vec<&str> = (0..key_b64.len())
        .step_by(4)
        .map(|i| &key_b64[i..std::cmp::min(i + 4, key_b64.len())])
        .collect();

    format!("LLT.{}", chunks.join("."))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            get_machine_id,
            check_license,
            activate_license,
            generate_trial_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
