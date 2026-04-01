cat > hooks/useEncryption.ts << 'EOF'
import { useState, useEffect, useCallback } from 'react';
import { EncryptionService } from '@/lib/crypto';
import { STORAGE_KEYS } from '@/lib/constants';

export function useEncryption(chatId: string, password: string | null) {
  const [encryption, setEncryption] = useState<EncryptionService | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!password || !chatId) {
      setIsVerifying(false);
      return;
    }

    const verify = async () => {
      try {
        const crypto = new EncryptionService(chatId, password);
        const isValid = await crypto.verifyPassword();
        
        if (isValid) {
          setEncryption(crypto);
          setIsUnlocked(true);
          sessionStorage.setItem(`${STORAGE_KEYS.UNLOCKED_PREFIX}${chatId}`, 'true');
        } else {
          setIsUnlocked(false);
        }
      } catch (error) {
        console.error('Password verification failed:', error);
        setIsUnlocked(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verify();
  }, [chatId, password]);

  const encryptMessage = useCallback(async (text: string): Promise<string> => {
    if (!encryption) throw new Error('Chat not unlocked');
    return await encryption.encrypt(text);
  }, [encryption]);

  const decryptMessage = useCallback(async (encrypted: string): Promise<string> => {
    if (!encryption) throw new Error('Chat not unlocked');
    return await encryption.decrypt(encrypted);
  }, [encryption]);

  return {
    encryption,
    isUnlocked,
    isVerifying,
    encryptMessage,
    decryptMessage,
  };
}
EOF