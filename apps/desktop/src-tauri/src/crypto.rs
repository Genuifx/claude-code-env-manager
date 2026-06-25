use aes::cipher::{BlockDecryptMut, BlockEncryptMut, KeyIvInit};
use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit};
use rand::Rng;
use scrypt::{scrypt, Params};
use std::sync::OnceLock;

type Aes256CbcEnc = cbc::Encryptor<aes::Aes256>;
type Aes256CbcDec = cbc::Decryptor<aes::Aes256>;

const PASSWORD: &[u8] = b"claude-code-env-manager-secret";
const SALT: &[u8] = b"salt";
static LOCAL_KEY: OnceLock<[u8; 32]> = OnceLock::new();
static INSTALL_KEY: OnceLock<[u8; 32]> = OnceLock::new();

/// Derive the same 32-byte key as Node.js crypto.scryptSync (legacy, migration only)
fn derive_key() -> [u8; 32] {
    *LOCAL_KEY.get_or_init(|| {
        let mut key = [0u8; 32];
        // Node.js scrypt defaults: N=16384, r=8, p=1
        let params = Params::new(14, 8, 1, 32).unwrap(); // log2(16384) = 14
        scrypt(PASSWORD, SALT, &params, &mut key).unwrap();
        key
    })
}

/// Get or create the per-install encryption key from ~/.ccem/.install-key.
/// Shared with the CLI (Node.js) since both use the same config directory.
fn get_or_create_install_key() -> [u8; 32] {
    *INSTALL_KEY.get_or_init(|| {
        let home = dirs::home_dir().expect("Could not find home directory");
        let key_path = home.join(".ccem").join(".install-key");

        if key_path.exists() {
            let content = std::fs::read_to_string(&key_path).unwrap_or_default();
            let trimmed = content.trim();
            if let Ok(bytes) = hex::decode(trimmed) {
                if bytes.len() == 32 {
                    let mut arr = [0u8; 32];
                    arr.copy_from_slice(&bytes);
                    return arr;
                }
            }
        }

        // Create new random key
        let mut rng = rand::thread_rng();
        let new_key: [u8; 32] = rng.gen();
        let key_dir = home.join(".ccem");
        let _ = std::fs::create_dir_all(&key_dir);
        let _ = std::fs::write(&key_path, hex::encode(new_key));

        // Set file permissions to 0600 on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&key_path, std::fs::Permissions::from_mode(0o600));
        }

        new_key
    })
}

/// Encrypt plaintext using AES-256-GCM with install-bound key.
/// Format: enc:v2:<nonce_hex>:<ciphertext_hex>:<tag_hex>
pub fn encrypt(plaintext: &str) -> String {
    if plaintext.is_empty() {
        return plaintext.to_string();
    }

    let key = get_or_create_install_key();
    let cipher = Aes256Gcm::new(&key.into());
    let nonce: [u8; 12] = rand::thread_rng().gen();

    let ciphertext = cipher
        .encrypt(aes_gcm::Nonce::from_slice(&nonce), plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))
        .unwrap_or_default();

    // aes-gcm appends the 16-byte tag to the ciphertext
    let ct_len = ciphertext.len().saturating_sub(16);
    let ct = &ciphertext[..ct_len];
    let tag = &ciphertext[ct_len..];

    format!(
        "enc:v2:{}:{}:{}",
        hex::encode(nonce),
        hex::encode(ct),
        hex::encode(tag)
    )
}

/// Decrypt ciphertext. Auto-detects v2 (AES-256-GCM) vs legacy (AES-256-CBC).
pub fn decrypt(ciphertext: &str) -> Result<String, String> {
    // If not encrypted, return as-is
    if !ciphertext.starts_with("enc:") {
        return Ok(ciphertext.to_string());
    }

    // v2 format: enc:v2:nonce_hex:ciphertext_hex:tag_hex
    if ciphertext.starts_with("enc:v2:") {
        let parts: Vec<&str> = ciphertext.split(':').collect();
        if parts.len() != 5 {
            return Err("Invalid v2 encrypted format".to_string());
        }

        let nonce_bytes = hex::decode(parts[2]).map_err(|e| format!("Invalid nonce: {}", e))?;
        let ct_bytes = hex::decode(parts[3]).map_err(|e| format!("Invalid ciphertext: {}", e))?;
        let tag_bytes = hex::decode(parts[4]).map_err(|e| format!("Invalid tag: {}", e))?;

        if nonce_bytes.len() != 12 || tag_bytes.len() != 16 {
            return Err("Invalid v2 encrypted format".to_string());
        }

        let key = get_or_create_install_key();
        let cipher = Aes256Gcm::new(&key.into());

        // aes-gcm expects ciphertext + tag concatenated
        let mut combined = ct_bytes.clone();
        combined.extend_from_slice(&tag_bytes);

        let plaintext = cipher
            .decrypt(aes_gcm::Nonce::from_slice(&nonce_bytes), combined.as_ref())
            .map_err(|_| "Decryption failed (wrong key or tampered data)".to_string())?;

        String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))
    } else {
        // Legacy format: enc:iv_hex:ciphertext_hex (AES-256-CBC with hardcoded key)
        decrypt_legacy(ciphertext)
    }
}

/// Decrypt a locally stored secret value with sanitized field context.
pub fn decrypt_local_secret(field_name: &str, value: &str) -> Result<String, String> {
    decrypt(value).map_err(|error| format!("Failed to decrypt {}: {}", field_name, error))
}

/// Decrypt legacy "enc:iv_hex:ciphertext_hex" format (AES-256-CBC).
/// Used only for migration — values are re-encrypted as v2 on next save.
fn decrypt_legacy(ciphertext: &str) -> Result<String, String> {
    let parts: Vec<&str> = ciphertext.split(':').collect();
    if parts.len() != 3 {
        return Ok(ciphertext.to_string());
    }

    let iv = hex::decode(parts[1]).map_err(|e| format!("Invalid IV: {}", e))?;
    let encrypted = hex::decode(parts[2]).map_err(|e| format!("Invalid ciphertext: {}", e))?;

    if iv.len() != 16 {
        return Err("Invalid IV length".to_string());
    }

    let key = derive_key();
    let iv_array: [u8; 16] = iv.try_into().unwrap();

    let mut buffer = encrypted.clone();
    let cipher = Aes256CbcDec::new(&key.into(), &iv_array.into());

    cipher
        .decrypt_padded_mut::<aes::cipher::block_padding::NoPadding>(&mut buffer)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    // Remove PKCS7 padding
    if let Some(&padding_len) = buffer.last() {
        let padding_len = padding_len as usize;
        if padding_len > 0 && padding_len <= 16 {
            buffer.truncate(buffer.len() - padding_len);
        }
    }

    String::from_utf8(buffer).map_err(|e| format!("Invalid UTF-8: {}", e))
}

/// Decrypt a remote server payload.
/// Key: scrypt(secret, "ccem-salt", 32) with N=16384,r=8,p=1
/// Input: base64(IV_16_bytes || ciphertext), AES-256-CBC
pub fn decrypt_remote(encrypted_base64: &str, secret: &str) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    let mut key = [0u8; 32];
    let params = Params::new(14, 8, 1, 32).unwrap();
    scrypt(secret.as_bytes(), b"ccem-salt", &params, &mut key).unwrap();

    let data = STANDARD
        .decode(encrypted_base64)
        .map_err(|e| format!("Invalid base64: {}", e))?;

    if data.len() < 17 {
        return Err("Encrypted data too short".to_string());
    }

    let iv: [u8; 16] = data[..16].try_into().unwrap();
    let mut buffer = data[16..].to_vec();

    let cipher = Aes256CbcDec::new(&key.into(), &iv.into());
    cipher
        .decrypt_padded_mut::<aes::cipher::block_padding::NoPadding>(&mut buffer)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    // Remove PKCS7 padding
    if let Some(&padding_len) = buffer.last() {
        let padding_len = padding_len as usize;
        if padding_len > 0 && padding_len <= 16 {
            buffer.truncate(buffer.len() - padding_len);
        }
    }

    String::from_utf8(buffer).map_err(|e| format!("Invalid UTF-8: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let plaintext = "sk-ant-api03-test-key";
        let encrypted = encrypt(plaintext);
        assert!(encrypted.starts_with("enc:v2:"));

        let decrypted = decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_decrypt_unencrypted() {
        let plaintext = "plain-text";
        let result = decrypt(plaintext).unwrap();
        assert_eq!(result, plaintext);
    }

    #[test]
    fn test_encrypt_empty() {
        let result = encrypt("");
        assert_eq!(result, "");
    }

    #[test]
    fn test_v2_format_structure() {
        let encrypted = encrypt("test-secret-key");
        assert!(encrypted.starts_with("enc:v2:"));
        let parts: Vec<&str> = encrypted.split(':').collect();
        // enc, v2, nonce, ciphertext, tag
        assert_eq!(parts.len(), 5);
        // nonce: 12 bytes = 24 hex chars
        assert_eq!(parts[2].len(), 24);
        // tag: 16 bytes = 32 hex chars
        assert_eq!(parts[4].len(), 32);
    }

    #[test]
    fn test_tamper_detection() {
        let encrypted = encrypt("sensitive-token-value");
        let parts: Vec<&str> = encrypted.split(':').collect();

        // Flip a bit in the ciphertext
        let mut tampered_ct = parts[3].to_string();
        let mut chars = tampered_ct.chars().collect::<Vec<_>>();
        chars[0] = if chars[0] == '0' { '1' } else { '0' };
        tampered_ct = chars.into_iter().collect();
        let _tampered = format!("{}:{}:{}:{}", parts[0], parts[1], parts[2], tampered_ct);

        // Tampered ciphertext should not have the tag part, so it won't parse correctly
        // But let's also test with a wrong tag
        let tampered_full = format!(
            "{}:{}:{}:{}:{}",
            parts[0], parts[1], parts[2], parts[3], "00000000000000000000000000000000"
        );

        let result = decrypt(&tampered_full);
        assert!(
            result.is_err(),
            "Tampered ciphertext should fail decryption"
        );
    }

    #[test]
    fn test_decrypt_malformed_v2_fails_closed() {
        let malformed = "enc:v2:not-enough-fields";

        let result = decrypt(malformed);

        assert!(result.is_err(), "Malformed v2 ciphertext should fail");
        let error = result.unwrap_err();
        assert!(
            !error.contains(malformed),
            "Error should not include encrypted secret material"
        );
    }

    #[test]
    fn test_decrypt_legacy_format() {
        // Create a legacy-format encrypted value using the old CBC method
        let plaintext = "legacy-api-key-12345";
        let key = derive_key();
        let iv: [u8; 16] = rand::thread_rng().gen();

        let block_size = 16;
        let padding_len = block_size - (plaintext.len() % block_size);
        let mut buffer = plaintext.as_bytes().to_vec();
        buffer.extend(std::iter::repeat_n(padding_len as u8, padding_len));
        let len = buffer.len();
        let cipher = Aes256CbcEnc::new(&key.into(), &iv.into());
        cipher
            .encrypt_padded_mut::<aes::cipher::block_padding::NoPadding>(&mut buffer, len)
            .unwrap();

        let legacy_encrypted = format!("enc:{}:{}", hex::encode(iv), hex::encode(&buffer));

        // Legacy decrypt should work
        let decrypted = decrypt(&legacy_encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_migration_legacy_to_v2() {
        // Step 1: Create legacy encrypted value
        let plaintext = "migration-test-key";
        let key = derive_key();
        let iv: [u8; 16] = rand::thread_rng().gen();

        let block_size = 16;
        let padding_len = block_size - (plaintext.len() % block_size);
        let mut buffer = plaintext.as_bytes().to_vec();
        buffer.extend(std::iter::repeat_n(padding_len as u8, padding_len));
        let len = buffer.len();
        let cipher = Aes256CbcEnc::new(&key.into(), &iv.into());
        cipher
            .encrypt_padded_mut::<aes::cipher::block_padding::NoPadding>(&mut buffer, len)
            .unwrap();

        let legacy_encrypted = format!("enc:{}:{}", hex::encode(iv), hex::encode(&buffer));

        // Step 2: Decrypt legacy value
        let decrypted = decrypt(&legacy_encrypted).unwrap();
        assert_eq!(decrypted, plaintext);

        // Step 3: Re-encrypt with v2
        let v2_encrypted = encrypt(&decrypted);
        assert!(v2_encrypted.starts_with("enc:v2:"));

        // Step 4: Decrypt v2 value — should match original
        let final_decrypted = decrypt(&v2_encrypted).unwrap();
        assert_eq!(final_decrypted, plaintext);
    }

    #[test]
    fn test_decrypt_remote_roundtrip() {
        use aes::cipher::{BlockEncryptMut, KeyIvInit};
        use base64::{engine::general_purpose::STANDARD, Engine as _};

        let secret = "my-test-secret";
        let plaintext = r#"{"environments":{"test":{"ANTHROPIC_BASE_URL":"https://example.com"}}}"#;

        // Derive key with same params
        let mut key = [0u8; 32];
        let params = Params::new(14, 8, 1, 32).unwrap();
        scrypt(secret.as_bytes(), b"ccem-salt", &params, &mut key).unwrap();

        // Encrypt: PKCS7 pad, AES-256-CBC, prepend IV, base64
        let iv: [u8; 16] = rand::thread_rng().gen();
        let block_size = 16;
        let padding_len = block_size - (plaintext.len() % block_size);
        let mut buffer = plaintext.as_bytes().to_vec();
        buffer.extend(std::iter::repeat_n(padding_len as u8, padding_len));
        let len = buffer.len();
        let cipher = Aes256CbcEnc::new(&key.into(), &iv.into());
        cipher
            .encrypt_padded_mut::<aes::cipher::block_padding::NoPadding>(&mut buffer, len)
            .unwrap();

        let mut combined = iv.to_vec();
        combined.extend_from_slice(&buffer);
        let encoded = STANDARD.encode(&combined);

        // Decrypt and verify
        let decrypted = decrypt_remote(&encoded, secret).unwrap();
        assert_eq!(decrypted, plaintext);
    }
}
