cat > lib/crypto.ts << 'EOF'
export class EncryptionService {
  private key: CryptoKey | null = null;
  private chatId: string;
  private password: string;

  constructor(chatId: string, password: string) {
    this.chatId = chatId;
    this.password = password;
  }

  private async deriveKey(): Promise<CryptoKey> {
    if (this.key) return this.key;

    const saltKey = `salt_${this.chatId}`;
    let salt = localStorage.getItem(saltKey);
    
    if (!salt) {
      salt = this.generateSalt();
      localStorage.setItem(saltKey, salt);
    }

    const encoder = new TextEncoder();
    const saltBuffer = this.base64ToBuffer(salt);
    
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    this.key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 600000,
        hash: 'SHA-256'
      },
      baseKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );

    return this.key;
  }

  async encrypt(text: string): Promise<string> {
    try {
      const key = await this.deriveKey();
      const encoder = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(text)
      );

      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return this.bufferToBase64(combined);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.deriveKey();
      const combined = this.base64ToBuffer(encryptedData);
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  async verifyPassword(): Promise<boolean> {
    try {
      await this.deriveKey();
      const testMessage = 'test';
      const encrypted = await this.encrypt(testMessage);
      const decrypted = await this.decrypt(encrypted);
      return decrypted === testMessage;
    } catch {
      return false;
    }
  }

  private generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return this.bufferToBase64(salt);
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  clearKey() {
    this.key = null;
  }
}
EOF