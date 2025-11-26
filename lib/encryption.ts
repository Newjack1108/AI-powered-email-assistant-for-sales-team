import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment variable
 * If not set, generates a key (but warns that it should be set in production)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    console.warn('⚠️  ENCRYPTION_KEY not set! Using a temporary key. This is NOT secure for production!');
    // Generate a temporary key (not secure - data encrypted with this won't be decryptable after restart)
    return crypto.randomBytes(KEY_LENGTH);
  }

  // If key is provided as hex string, convert it
  if (key.length === 64) {
    // Assume it's a hex-encoded 32-byte key
    return Buffer.from(key, 'hex');
  }

  // Otherwise, derive a key from the string using PBKDF2
  return crypto.pbkdf2Sync(key, 'email-assistant-salt', 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt sensitive data (OAuth tokens, SMTP passwords)
 */
export function encrypt(text: string): string {
  if (!text) {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    // Return iv:tag:encrypted
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure encryption key (for setting ENCRYPTION_KEY env var)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

