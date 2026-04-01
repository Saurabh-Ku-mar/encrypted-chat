cat > lib/constants.ts << 'EOF'
export const MAX_PARTICIPANTS = 10;
export const MESSAGE_HISTORY_LIMIT = 500;
export const INVITE_EXPIRY_DAYS = 7;
export const PBKDF2_ITERATIONS = 600000;
export const AES_IV_LENGTH = 12;
export const AES_KEY_LENGTH = 256;

export const STORAGE_KEYS = {
  PASSWORD_PREFIX: 'chat_password_',
  SALT_PREFIX: 'chat_salt_',
  USER_NAME_PREFIX: 'chat_username_',
  UNLOCKED_PREFIX: 'chat_unlocked_',
} as const;

export const ERROR_MESSAGES = {
  INVALID_PASSWORD: 'Invalid chat password',
  CHAT_FULL: 'Chat has reached maximum capacity (10 participants)',
  INVALID_INVITE: 'Invalid or expired invite code',
  ENCRYPTION_FAILED: 'Failed to encrypt message',
  DECRYPTION_FAILED: 'Failed to decrypt message',
  NETWORK_ERROR: 'Network error, please try again',
} as const;
EOF
