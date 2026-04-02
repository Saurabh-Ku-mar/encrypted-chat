/**
 * ENCRYPTED CHAT - CRYPTOGRAPHY LIBRARY
 * Using Web Crypto API for AES-GCM encryption
 * NIST-compliant PBKDF2 for key derivation
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface EncryptedMessage {
  iv: string;
  ciphertext: string;
  authTag: string;
  additionalData: string;
}

export interface EncryptedImage {
  iv: string;
  ciphertext: string;
  authTag: string;
  encryptedFilename: string;
  encryptedMimeType: string;
}

// ============================================
// CONFIGURATION
// ============================================

const CRYPTO_CONFIG = {
  // AES-GCM configuration
  AES_KEY_LENGTH: 256, // bits
  IV_LENGTH: 12, // bytes (96 bits for GCM)
  TAG_LENGTH: 128, // bits

  // PBKDF2 configuration (NIST SP 800-132)
  PBKDF2_ITERATIONS: 600000, // Minimum recommended
  PBKDF2_SALT_LENGTH: 16, // bytes
  PBKDF2_HASH: 'SHA-256' as const,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(length));
}

/**
 * SHA-256 hash of a string
 */
export async function sha256(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

// ============================================
// KEY DERIVATION (PBKDF2)
// ============================================

/**
 * Derive a master key (KEK) from user password and salt
 * Uses NIST-compliant PBKDF2 with high iterations
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  console.log('[v0] Deriving key from password using PBKDF2...');

  // Import password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive key using PBKDF2
  const kdk = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      hash: CRYPTO_CONFIG.PBKDF2_HASH,
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: CRYPTO_CONFIG.AES_KEY_LENGTH,
    },
    false, // non-extractable for security
    ['encrypt', 'decrypt']
  );

  console.log('[v0] Key derivation complete');
  return kdk;
}

/**
 * Generate salt from invite code hash
 */
export async function generateSaltFromInviteCode(
  inviteCode: string
): Promise<Uint8Array> {
  const hash = await sha256(inviteCode);
  return hash.slice(0, CRYPTO_CONFIG.PBKDF2_SALT_LENGTH);
}

// ============================================
// MESSAGE ENCRYPTION
// ============================================

/**
 * Encrypt a text message using AES-GCM
 */
export async function encryptMessage(
  plaintext: string,
  key: CryptoKey,
  senderId: string,
  timestamp: number
): Promise<EncryptedMessage> {
  console.log('[v0] Encrypting message...');

  try {
    // Generate unique IV per message
    const iv = generateRandomBytes(CRYPTO_CONFIG.IV_LENGTH);

    // Create additional authenticated data
    const aadString = `${timestamp}:${senderId}`;
    const aad = new TextEncoder().encode(aadString);

    // Encrypt
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: aad,
      },
      key,
      new TextEncoder().encode(plaintext)
    );

    // Extract auth tag (last 16 bytes of ciphertext)
    const ciphertextArray = new Uint8Array(ciphertext);
    const authTag = ciphertextArray.slice(ciphertextArray.length - 16);

    console.log('[v0] Message encrypted successfully');

    return {
      iv: arrayBufferToBase64(iv),
      ciphertext: arrayBufferToBase64(ciphertext),
      authTag: arrayBufferToBase64(authTag),
      additionalData: arrayBufferToBase64(aad),
    };
  } catch (error) {
    console.error('[v0] Encryption error:', error);
    throw new Error('Message encryption failed');
  }
}

// ============================================
// MESSAGE DECRYPTION
// ============================================

/**
 * Decrypt a text message using AES-GCM
 */
export async function decryptMessage(
  encrypted: EncryptedMessage,
  key: CryptoKey
): Promise<string | null> {
  console.log('[v0] Decrypting message...');

  try {
    // Convert from Base64
    const iv = new Uint8Array(base64ToArrayBuffer(encrypted.iv));
    const ciphertext = new Uint8Array(
      base64ToArrayBuffer(encrypted.ciphertext)
    );
    const aad = new Uint8Array(base64ToArrayBuffer(encrypted.additionalData));

    // Decrypt
    const plaintext = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: aad,
      },
      key,
      ciphertext
    );

    const message = new TextDecoder().decode(plaintext);
    console.log('[v0] Message decrypted successfully');
    return message;
  } catch (error) {
    console.error('[v0] Decryption failed - wrong key or tampered data:', error);
    return null; // Wrong key or tampered data
  }
}

// ============================================
// IMAGE ENCRYPTION
// ============================================

/**
 * Remove EXIF metadata from image
 */
async function removeEXIFMetadata(blob: Blob): Promise<Blob> {
  console.log('[v0] Removing EXIF metadata from image...');

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    return new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob((cleanBlob) => {
          if (cleanBlob) {
            console.log('[v0] EXIF metadata removed');
            resolve(cleanBlob);
          } else {
            reject(new Error('Failed to clean image'));
          }
        }, 'image/jpeg', 0.95);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error('[v0] EXIF removal failed, using original:', error);
    return blob; // Fall back to original
  }
}

/**
 * Encrypt an image file using AES-GCM
 */
export async function encryptImage(
  file: Blob,
  key: CryptoKey,
  senderId: string
): Promise<EncryptedImage> {
  console.log('[v0] Encrypting image...');

  try {
    // Remove EXIF metadata
    const cleanedBlob = await removeEXIFMetadata(file);

    // Read as ArrayBuffer
    const arrayBuffer = await cleanedBlob.arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);

    // Generate unique IV
    const iv = generateRandomBytes(CRYPTO_CONFIG.IV_LENGTH);

    // Encrypt image data
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      imageData
    );

    // Encrypt metadata
    const filename = (file as any).name || 'image.jpg';
    const mimeType = file.type || 'image/jpeg';
    const timestamp = Date.now();

    const encryptedFilename = await encryptMessage(
      filename,
      key,
      senderId,
      timestamp
    );

    const encryptedMimeType = await encryptMessage(
      mimeType,
      key,
      senderId,
      timestamp
    );

    console.log('[v0] Image encrypted successfully');

    return {
      iv: arrayBufferToBase64(iv),
      ciphertext: arrayBufferToBase64(ciphertext),
      authTag: arrayBufferToBase64(
        new Uint8Array(ciphertext).slice(new Uint8Array(ciphertext).length - 16)
      ),
      encryptedFilename: encryptedFilename.ciphertext,
      encryptedMimeType: encryptedMimeType.ciphertext,
    };
  } catch (error) {
    console.error('[v0] Image encryption error:', error);
    throw new Error('Image encryption failed');
  }
}

// ============================================
// IMAGE DECRYPTION
// ============================================

/**
 * Decrypt an image and return blob URL (memory only)
 */
export async function decryptImage(
  encrypted: EncryptedImage,
  key: CryptoKey
): Promise<string | null> {
  console.log('[v0] Decrypting image...');

  try {
    const iv = new Uint8Array(base64ToArrayBuffer(encrypted.iv));
    const ciphertext = new Uint8Array(
      base64ToArrayBuffer(encrypted.ciphertext)
    );

    // Decrypt
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    // Create blob URL (stays in memory)
    const blob = new Blob([decrypted], { type: 'image/jpeg' });
    const blobUrl = URL.createObjectURL(blob);

    console.log('[v0] Image decrypted successfully');
    return blobUrl;
  } catch (error) {
    console.error('[v0] Image decryption failed:', error);
    return null;
  }
}

/**
 * Clean up blob URL to free memory
 */
export function revokeBlobUrl(blobUrl: string): void {
  URL.revokeObjectURL(blobUrl);
  console.log('[v0] Blob URL revoked');
}

// ============================================
// SESSION KEY MANAGEMENT
// ============================================

const SESSION_STORAGE_KEY = 'encrypted_chat_session';

/**
 * Store derived key in volatile memory (sessionStorage - cleared on tab close)
 */
export function storeSessionKey(chatId: string, key: CryptoKey): void {
  // Note: CryptoKey cannot be stored/serialized
  // Store in globalThis instead, which is cleared on refresh
  if (typeof globalThis !== 'undefined') {
    (globalThis as any)[`SESSION_KEY_${chatId}`] = key;
    console.log('[v0] Session key stored in memory');
  }
}

/**
 * Retrieve session key from memory
 */
export function getSessionKey(chatId: string): CryptoKey | null {
  if (typeof globalThis !== 'undefined') {
    const key = (globalThis as any)[`SESSION_KEY_${chatId}`];
    return key || null;
  }
  return null;
}

/**
 * Lock session - clear all keys from memory
 */
export function lockSession(chatId: string): void {
  if (typeof globalThis !== 'undefined') {
    delete (globalThis as any)[`SESSION_KEY_${chatId}`];
    console.log('[v0] Session locked - keys cleared from memory');
  }
}

/**
 * Lock all sessions
 */
export function lockAllSessions(): void {
  if (typeof globalThis !== 'undefined') {
    for (const key in globalThis) {
      if (key.startsWith('SESSION_KEY_')) {
        delete (globalThis as any)[key];
      }
    }
    console.log('[v0] All sessions locked');
  }
}

// ============================================
// AUTO-LOCK ON TAB VISIBILITY
// ============================================

export function setupAutoLock(chatId: string): void {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lockSession(chatId);
      console.log('[v0] Auto-lock triggered (tab hidden)');
      // Notify UI to show lock screen
      window.dispatchEvent(
        new CustomEvent('chat:locked', { detail: { chatId } })
      );
    }
  });

  window.addEventListener('beforeunload', () => {
    lockSession(chatId);
    console.log('[v0] Auto-lock triggered (tab closing)');
  });
}

// ============================================
// INVITE CODE GENERATION
// ============================================

/**
 * Generate a random invite code (32 bytes = 256 bits of entropy)
 */
export function generateInviteCode(): string {
  const randomBytes = generateRandomBytes(32);
  return arrayBufferToBase64(randomBytes);
}

// ============================================
// INPUT VALIDATION
// ============================================

/**
 * Validate codename format
 */
export function validateCodename(codename: string): boolean {
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  return regex.test(codename);
}

/**
 * Validate message length
 */
export function validateMessage(message: string): boolean {
  return message.length > 0 && message.length <= 5000;
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedMimes = ['image/jpeg', 'image/png'];

  if (!allowedMimes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG and PNG images allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be under 5MB' };
  }

  return { valid: true };
}

export default {
  deriveKeyFromPassword,
  generateSaltFromInviteCode,
  encryptMessage,
  decryptMessage,
  encryptImage,
  decryptImage,
  revokeBlobUrl,
  storeSessionKey,
  getSessionKey,
  lockSession,
  lockAllSessions,
  setupAutoLock,
  generateInviteCode,
  validateCodename,
  validateMessage,
  validateImageFile,
  sha256,
};
