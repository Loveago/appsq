import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const PREFIX = 'enc_v1';

function getDerivedKey(customSecret?: string): Buffer {
  const secret =
    customSecret ||
    process.env.ENCRYPTION_SECRET ||
    process.env.JWT_SECRET ||
    'mindora_secure_subscription_encryption_key_2026';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a sensitive string (e.g. RevenueCat Secret Key, Webhook Secret) using AES-256-GCM.
 */
export function encryptSecret(plainText: string, customSecret?: string): string {
  if (!plainText || plainText.trim() === '') return '';
  if (plainText.startsWith(PREFIX)) return plainText; // already encrypted

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getDerivedKey(customSecret);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${PREFIX}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 */
export function decryptSecret(encryptedPayload: string, customSecret?: string): string {
  if (!encryptedPayload || encryptedPayload.trim() === '') return '';
  if (!encryptedPayload.startsWith(PREFIX)) {
    // Unencrypted legacy fallback
    return encryptedPayload;
  }

  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 4) return '';

    const [, ivHex, authTagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getDerivedKey(customSecret);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // Decryption failure (tampered, wrong key)
    return '';
  }
}

/**
 * Safely masks secrets for browser or API responses so credentials are never sent plaintext.
 */
export function maskSecret(value?: string | null, customSecret?: string): string {
  if (!value || value.trim() === '') return '';

  let plain = value;
  if (value.startsWith(PREFIX)) {
    plain = decryptSecret(value, customSecret);
  }

  if (!plain || plain.trim() === '') return '';

  // Retain prefix for recognized SDK keys if useful for visual confirmation
  if (plain.startsWith('sk_') && plain.length > 8) {
    return `sk_••••••••••••${plain.slice(-4)}`;
  }
  if (plain.startsWith('goog_') && plain.length > 8) {
    return `goog_••••••••••••${plain.slice(-4)}`;
  }
  if (plain.startsWith('appl_') && plain.length > 8) {
    return `appl_••••••••••••${plain.slice(-4)}`;
  }

  if (plain.length <= 8) {
    return '••••••••••••';
  }

  return `••••••••••••${plain.slice(-4)}`;
}

/**
 * Returns true if a string is a masked placeholder (user did not change it in the UI).
 */
export function isMaskedValue(value?: string | null): boolean {
  if (!value) return false;
  return value.includes('••••') || value.includes('***');
}
