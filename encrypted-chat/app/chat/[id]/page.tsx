cat > app/chat/[id]/page.tsx << 'EOF'
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import { useEncryption } from '@/hooks/useEncryption';
import { useChat } from '@/hooks/useChat';
import { STORAGE_KEYS, MAX_PARTICIPANTS } from '@/lib/constants';
import ChatHeader from '@/components/ChatHeader';
import MessageList from '@/components/MessageList';
import MessageInput from '@/components/MessageInput';
import ParticipantList from '@/components/ParticipantList';
import PasswordModal from '@/components/PasswordModal';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;

  const [userName, setUserName] = useState('');
  const [chatName, setChatName] = useState('');
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [decryptingMessages, setDecryptingMessages] = useState(true);
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map());

  const { isUnlocked, isVerifying, encryptMessage, decryptMessage } = useEncryption(
    chatId,
    storedPassword
  );

  const {
    messages,
    participants,
    participantCount,
    isLoading,
    error,
    sendMessage: sendEncryptedMessage,
  } = useChat(chatId, userName, isUnlocked);

  useEffect(() => {
    db.getChat(chatId).then(chat => {
      setChatName(chat.name);
    }).catch(() => {
      router.push('/');
    });
  }, [chatId, router]);

  useEffect(() => {
    const storedName = sessionStorage.getItem(`${STORAGE_KEYS.USER_NAME_PREFIX}${chatId}`);
    if (storedName) {
      setUserName(storedName);
    } else {
      const name = prompt('Enter your display name:') || `User${Math.floor(Math.random() * 1000)}`;
      setUserName(name);
      sessionStorage.setItem(`${STORAGE_KEYS.USER_NAME_PREFIX}${chatId}`, name);
    }
  }, [chatId]);

  useEffect(() => {
    const savedPassword = sessionStorage.getItem(`${STORAGE_KEYS.PASSWORD_PREFIX}${chatId}`);
    if (savedPassword) {
      setStoredPassword(savedPassword);
    } else {
      setShowPasswordModal(true);
    }
  }, [chatId]);

  useEffect(() => {
    if (!isUnlocked || messages.length === 0) {
      if (messages.length === 0) setDecryptingMessages(false);
      return;
    }

    setDecryptingMessages(true);
    
    const decryptAll = async () => {
      const newDecrypted = new Map();
      for (const msg of messages) {
        if (!decryptedMessages.has(msg.id)) {
          try {
            const decrypted = await decryptMessage(msg.encrypted_content);
            newDecrypted.set(msg.id, decrypted);
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            newDecrypted.set(msg.id, '❌ Failed to decrypt');
          }
        }
      }
      
      if (newDecrypted.size > 0) {
        setDecryptedMessages(prev => new Map([...prev, ...newDecrypted]));
      }
      setDecryptingMessages(false);
    };

    decryptAll();
  }, [isUnlocked, messages, decryptMessage]);

  const handlePasswordSubmit = (password: string) => {
    sessionStorage.setItem(`${STORAGE_KEYS.PASSWORD_PREFIX}${chatId}`, password);
    setStoredPassword(password);
    setShowPasswordModal(false);
  };

  const handleSendMessage = async (text: string) => {
    try {
      const encrypted = await encryptMessage(text);
      await sendEncryptedMessage(encrypted);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const messagesWithDecrypted = messages.map(msg => ({
    ...msg,
    decrypted: decryptedMessages.get(msg.id),
  }));

  if (isVerifying || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-lg">Loading secure chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-900/50 text-red-200 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ChatHeader
        chatName={chatName}
        participantCount={participantCount}
        maxParticipants={MAX_PARTICIPANTS}
        userName={userName}
        chatId={chatId}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <MessageList
            messages={messagesWithDecrypted}
            currentUserName={userName}
            isDecrypting={decryptingMessages}
          />
          <MessageInput
            onSend={handleSendMessage}
            disabled={!isUnlocked}
          />
        </div>
        <ParticipantList
          participants={participants}
          currentUserName={userName}
        />
      </div>

      <PasswordModal
        isOpen={showPasswordModal}
        onSubmit={handlePasswordSubmit}
        onCancel={() => router.push('/')}
      />
    </div>
  );
}
EOF
