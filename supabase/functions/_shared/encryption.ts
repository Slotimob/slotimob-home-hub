/**
 * Encryption utilities for securing API keys in the database
 * Uses AES-256-GCM for authenticated encryption
 */

// Prefix to identify encrypted values
const ENCRYPTED_PREFIX = 'enc:v1:';

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get the encryption key from environment as ArrayBuffer
 */
function getEncryptionKey(): ArrayBuffer {
  const keyHex = Deno.env.get('API_ENCRYPTION_KEY');
  if (!keyHex) {
    throw new Error('API_ENCRYPTION_KEY is not configured');
  }
  if (keyHex.length !== 64) {
    throw new Error('API_ENCRYPTION_KEY must be 64 hex characters (256 bits)');
  }
  const bytes = hexToBytes(keyHex);
  // Create a new ArrayBuffer and copy the data to ensure proper type
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/**
 * Check if a value is already encrypted
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Encrypt a plaintext value using AES-256-GCM
 * Returns a string in format: enc:v1:<base64(iv:ciphertext:tag)>
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) {
    return plaintext;
  }

  // Don't double-encrypt
  if (isEncrypted(plaintext)) {
    return plaintext;
  }

  const keyBuffer = getEncryptionKey();
  
  // Generate a random 12-byte IV (recommended for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt the plaintext
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 16 bytes auth tag
    },
    cryptoKey,
    plaintextBytes
  );
  
  // Combine IV + ciphertext (which includes the auth tag in WebCrypto)
  const ciphertextArray = new Uint8Array(ciphertext);
  const combined = new Uint8Array(iv.length + ciphertextArray.length);
  combined.set(iv, 0);
  combined.set(ciphertextArray, iv.length);
  
  // Return with prefix for identification
  return ENCRYPTED_PREFIX + bytesToBase64(combined);
}

/**
 * Decrypt an encrypted value
 * Handles both encrypted and plaintext values (for migration)
 */
export async function decrypt(encryptedValue: string): Promise<string> {
  if (!encryptedValue) {
    return encryptedValue;
  }

  // If not encrypted, return as-is (allows gradual migration)
  if (!isEncrypted(encryptedValue)) {
    return encryptedValue;
  }

  const keyBuffer = getEncryptionKey();
  
  // Remove prefix and decode
  const encoded = encryptedValue.slice(ENCRYPTED_PREFIX.length);
  const combined = base64ToBytes(encoded);
  
  // Extract IV (first 12 bytes) and ciphertext (rest)
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    cryptoKey,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt a value only if it's not already encrypted
 * Useful for update operations where you might receive an already-encrypted value
 */
export async function ensureEncrypted(value: string): Promise<string> {
  if (!value || isEncrypted(value)) {
    return value;
  }
  return encrypt(value);
}
