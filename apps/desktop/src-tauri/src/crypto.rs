use aes::cipher::{BlockDecryptMut, BlockEncryptMut, KeyIvInit};
use rand::Rng;
use scrypt::{scrypt, Params};
use std::sync::OnceLock;

type Aes256CbcEnc = cbc::Encryptor<aes::Aes256>;
type Aes256CbcDec = cbc::Decryptor<aes::Aes256>;

const PASSWORD: &[u8] = b"claude-code-env-manager-secret";
const SALT: &[u8] = b"salt";
static LOCAL_KEY: OnceLock<[u8; 32]> = OnceLock::new();

/// Derive the same 32-byte key as Node.js crypto.scryptSync
fn derive_key() -> [u8; 32] {
    *LOCAL_KEY.get_or_init(|| {
        let mut key = [0u8; 32];
        // Node.js scrypt defaults: N=16384, r=8, p=1
        let params = Params::new(14, 8, 1, 32).unwrap(); // log2(16384) = 14
        scrypt(PASSWORD, SALT, &params, &mut key).unwrap();
        key
    })
}

/// Encrypt plaintext using AES-256-CBC, returns "enc:iv_hex:ciphertext_hex"
pub fn encrypt(plaintext: &str) -> String {
    if plaintext.is_empty() {
        return plaintext.to_string();
    }

    let key = derive_key();
    let iv: [u8; 16] = rand::thread_rng().gen();

    // PKCS7 padding
    let block_size = 16;
    let padding_len = block_size - (plaintext.len() % block_size);
    let mut buffer = plaintext.as_bytes().to_vec();
    buffer.extend(std::iter::repeat_n(padding_len as u8, padding_len));

    let len = buffer.len();
    let cipher = Aes256CbcEnc::new(&key.into(), &iv.into());
    cipher
        .encrypt_padded_mut::<aes::cipher::block_padding::NoPadding>(&mut buffer, len)
        .unwrap();

    format!("enc:{}:{}", hex::encode(iv), hex::encode(&buffer))
}

/// Decrypt "enc:iv_hex:ciphertext_hex" format, returns plaintext
pub fn decrypt(ciphertext: &str) -> Result<String, String> {
    // If not encrypted, return as-is
    if !ciphertext.starts_with("enc:") {
        return Ok(ciphertext.to_string());
    }

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
        assert!(encrypted.starts_with("enc:"));

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
        buffer.extend(std::iter::repeat(padding_len as u8).take(padding_len));
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
