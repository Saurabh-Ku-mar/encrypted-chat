cat > hooks/useChat.ts << 'EOF'
import { useState, useEffect, useCallback } from 'react';
import { supabase, db } from '@/lib/supabase';
import { Message } from '@/lib/types';
import { MAX_PARTICIPANTS } from '@/lib/constants';

export function useChat(chatId: string, userName: string, isUnlocked: boolean) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUnlocked) return;

    const loadMessages = async () => {
      try {
        const data = await db.getMessages(chatId);
        setMessages(data);
      } catch (err) {
        setError('Failed to load messages');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [chatId, isUnlocked]);

  useEffect(() => {
    if (!isUnlocked) return;

    const subscription = supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chatId, isUnlocked]);

  useEffect(() => {
    if (!isUnlocked) return;

    const loadParticipants = async () => {
      try {
        const users = await db.getParticipants(chatId);
        const count = await db.getParticipantCount(chatId);
        setParticipants(users);
        setParticipantCount(count);
      } catch (err) {
        console.error('Failed to load participants:', err);
      }
    };

    loadParticipants();

    const subscription = supabase
      .channel(`participants:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chatId, isUnlocked]);

  useEffect(() => {
    if (!isUnlocked || !userName) return;

    const addUser = async () => {
      try {
        const currentCount = await db.getParticipantCount(chatId);
        if (currentCount >= MAX_PARTICIPANTS) {
          setError('Chat is full');
          return;
        }
        await db.addParticipant(chatId, userName);
      } catch (err) {
        console.error('Failed to add participant:', err);
      }
    };

    addUser();

    return () => {
      db.removeParticipant(chatId, userName).catch(console.error);
    };
  }, [chatId, userName, isUnlocked]);

  const sendMessage = useCallback(async (encryptedContent: string) => {
    if (!encryptedContent || !userName) return;
    
    try {
      await db.addMessage(chatId, encryptedContent, userName);
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    }
  }, [chatId, userName]);

  return {
    messages,
    participants,
    participantCount,
    isLoading,
    error,
    sendMessage,
  };
}
EOF
