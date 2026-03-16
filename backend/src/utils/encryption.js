const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-cbc';

// Derive a 32-byte key from the configured encryption key
function getKey() {
    return crypto
        .createHash('sha256')
        .update(env.encryption.key)
        .digest();
}

/**
 * Encrypt a plaintext string using AES-256-CBC.
 * Returns a string in the format: iv:encryptedData (both hex-encoded).
 */
function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a previously encrypted string.
 * Expects input in the format: iv:encryptedData (both hex-encoded).
 */
function decrypt(encryptedText) {
    if (!encryptedText) return null;
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = { encrypt, decrypt };
