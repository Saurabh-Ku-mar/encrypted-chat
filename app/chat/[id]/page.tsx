'use client';

import React from "react"

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Lock, Unlock, LogOut, Upload, Send, Trash2 } from 'lucide-react';
import { getChat, getMessages, sendMessage, deleteMessage } from '@/lib/supabase';
import {
  deriveKeyFromPassword,
  generateSaltFromInviteCode,
  encryptMessage,
  decryptMessage,
  setupAutoLock,
  lockSession,
  storeSessionKey,
  getSessionKey,
  validateMessage as validateMessageLength,
  validateImageFile,
  encryptImage,
  decryptImage,
  revokeBlobUrl,
} from '@/lib/crypto';
import { Chat, Message as MessageType } from '@/lib/supabase';
import type { EncryptedMessage } from '@/lib/crypto';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;

  // UI State
  const [isLocked, setIsLocked] = useState(true);
  const [unlockSecret, setUnlockSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Chat Data
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<
    Record<string, string | null>
  >({});

  // Message Input
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Image Gallery
  const [decryptedImages, setDecryptedImages] = useState<
    Record<string, string>
  >({});
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat on mount
  useEffect(() => {
    const loadChat = async () => {
      try {
        console.log('[v0] Loading chat:', chatId);
        const chatData = await getChat(chatId);
        if (!chatData) {
          setError('Chat not found');
          setLoading(false);
          return;
        }
        setChat(chatData);

        // Load messages
        const msgs = await getMessages(chatId);
        setMessages(msgs);

        setLoading(false);
      } catch (err) {
        console.error('[v0] Error loading chat:', err);
        setError('Failed to load chat');
        setLoading(false);
      }
    };

    loadChat();
  }, [chatId]);

  // Setup auto-lock
  useEffect(() => {
    setupAutoLock(chatId);
    window.addEventListener('chat:locked', handleAutoLock);
    return () => window.removeEventListener('chat:locked', handleAutoLock);
  }, [chatId]);

  const handleAutoLock = (e: any) => {
    if (e.detail?.chatId === chatId) {
      setIsLocked(true);
      setDecryptedMessages({});
      setMessageText('');
    }
  };

  // Unlock chat
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      console.log('[v0] Unlocking chat...');

      // Get invite code from sessionStorage
      const inviteCode = sessionStorage.getItem(`invite_${chatId}`);
      if (!inviteCode) {
        setError('Invite code not found. Please rejoin the chat.');
        return;
      }

      // Derive key from unlock secret
      const salt = await generateSaltFromInviteCode(inviteCode);
      const key = await deriveKeyFromPassword(unlockSecret, salt);

      // Store key in memory
      storeSessionKey(chatId, key);

      // Try decrypting one message to verify
      if (messages.length > 0) {
        const testMsg = messages[0];
        const encrypted: EncryptedMessage = {
          iv: testMsg.iv,
          ciphertext: testMsg.ciphertext,
          authTag: testMsg.auth_tag,
          additionalData: testMsg.additional_data,
        };

        const decrypted = await decryptMessage(encrypted, key);
        if (!decrypted) {
          setError('Wrong unlock secret. Messages remain locked.');
          setUnlockSecret('');
          return;
        }
      }

      // Decrypt all messages
      const decrypted: Record<string, string | null> = {};
      for (const msg of messages) {
        const encrypted: EncryptedMessage = {
          iv: msg.iv,
          ciphertext: msg.ciphertext,
          authTag: msg.auth_tag,
          additionalData: msg.additional_data,
        };
        const text = await decryptMessage(encrypted, key);
        decrypted[msg.id] = text;
      }

      setDecryptedMessages(decrypted);
      setIsLocked(false);
      setUnlockSecret('');
      setMessageText('');

      console.log('[v0] Chat unlocked');
    } catch (err) {
      console.error('[v0] Unlock error:', err);
      setError('An error occurred. Please try again.');
    }
  };

  // Get current user ID
  const getCurrentUserId = async (): Promise<string | null> => {
    const { data: sessionData } = await (
      await import('@/lib/supabase')
    ).supabase.auth.getSession();
    return sessionData?.session?.user.id || null;
  };

  // Handle image upload
  const handleImageSelected = async (file: File | null) => {
    if (!file || isLocked || !chat) return;

    setUploadingImage(true);
    setError('');

    try {
      console.log('[v0] Uploading image...');

      // Validate image
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid image');
        return;
      }

      const key = getSessionKey(chatId);
      if (!key) {
        setError('Session expired. Please unlock again.');
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        setError('Not authenticated');
        return;
      }

      // Encrypt image
      const encrypted = await encryptImage(file, key, userId);

      // Upload to database
      const { uploadImage: uploadImageDb } = await import('@/lib/supabase');
      const imageRecord = await uploadImageDb(
        chatId,
        userId,
        encrypted.iv,
        encrypted.ciphertext,
        encrypted.authTag,
        encrypted.encryptedFilename,
        encrypted.encryptedMimeType,
        file.size,
        file.name
      );

      if (!imageRecord) {
        setError('Failed to upload image');
        return;
      }

      // Send message with image reference
      const timestamp = Date.now();
      const messageContent = `[IMAGE: ${file.name}]`;
      const messageEncrypted = await encryptMessage(
        messageContent,
        key,
        userId,
        timestamp
      );

      const msg = await sendMessage(
        chatId,
        userId,
        chat.codename_a === chat.user_a
          ? chat.codename_a
          : chat.codename_b || 'Unknown',
        messageEncrypted.iv,
        messageEncrypted.ciphertext,
        messageEncrypted.authTag,
        messageEncrypted.additionalData,
        'image',
        imageRecord.id
      );

      if (msg) {
        setMessages([...messages, msg]);
        setDecryptedMessages({
          ...decryptedMessages,
          [msg.id]: messageContent,
        });
        setSelectedImage(null);
      }

      console.log('[v0] Image uploaded');
    } catch (err) {
      console.error('[v0] Image upload error:', err);
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !messageText.trim() || !chat) return;

    setSendingMessage(true);
    setError('');

    try {
      console.log('[v0] Sending message...');

      if (!validateMessageLength(messageText)) {
        setError('Message too long (max 5000 chars)');
        return;
      }

      const key = getSessionKey(chatId);
      if (!key) {
        setError('Session expired. Please unlock again.');
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        setError('Not authenticated');
        return;
      }

      const timestamp = Date.now();
      const encrypted = await encryptMessage(
        messageText,
        key,
        userId,
        timestamp
      );

      const msg = await sendMessage(
        chatId,
        userId,
        chat.codename_a === chat.user_a
          ? chat.codename_a
          : chat.codename_b || 'Unknown',
        encrypted.iv,
        encrypted.ciphertext,
        encrypted.authTag,
        encrypted.additionalData,
        'text'
      );

      if (msg) {
        setMessages([...messages, msg]);
        setDecryptedMessages({
          ...decryptedMessages,
          [msg.id]: messageText,
        });
        setMessageText('');
      }

      console.log('[v0] Message sent');
    } catch (err) {
      console.error('[v0] Send message error:', err);
      setError('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;

    try {
      await deleteMessage(messageId);
      setMessages(messages.filter((m) => m.id !== messageId));
      const updated = { ...decryptedMessages };
      delete updated[messageId];
      setDecryptedMessages(updated);
    } catch (err) {
      console.error('[v0] Delete error:', err);
      setError('Failed to delete message');
    }
  };

  // Logout
  const handleLogout = () => {
    lockSession(chatId);
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-8 h-8 text-accent mx-auto mb-4 animate-pulse" />
          <p className="font-mono text-sm">LOADING CHAT...</p>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-sm text-destructive">CHAT NOT FOUND</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold">
              {chat.codename_a}
            </span>
            <span className="text-xs text-muted-foreground">↔</span>
            <span className="text-sm font-mono font-semibold">
              {chat.codename_b || '...'}
            </span>
          </div>
          {isLocked ? (
            <Lock className="w-4 h-4 text-red-500" />
          ) : (
            <Unlock className="w-4 h-4 text-accent" />
          )}
        </div>

        <button
          onClick={handleLogout}
          className="p-2 hover:bg-secondary rounded transition-colors text-muted-foreground hover:text-foreground"
          title="Burn session and logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Chat Area */}
      {isLocked ? (
        <div className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-md w-full space-y-6">
            <div className="space-y-2 text-center">
              <Lock className="w-8 h-8 text-accent mx-auto" />
              <h2 className="text-2xl font-mono font-bold">CHAT IS LOCKED</h2>
              <p className="text-sm text-muted-foreground">
                Enter your unlock secret to view messages
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4">
              <input
                type="password"
                value={unlockSecret}
                onChange={(e) => {
                  setUnlockSecret(e.target.value);
                  setError('');
                }}
                placeholder="Unlock secret..."
                className="w-full px-4 py-2 bg-secondary border border-border rounded font-mono text-sm focus:border-accent focus:outline-none"
                autoFocus
              />

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-2 bg-accent text-primary font-mono font-semibold rounded border border-accent hover:bg-accent/90 transition-colors"
              >
                UNLOCK
              </button>
            </form>

            <div className="border-t border-border pt-4 text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-accent">[UNLOCK INFO]</p>
              <p>
                Wrong key = no access. Use the same secret both users agreed on.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-center text-sm text-muted-foreground">
                  No messages yet. Start the conversation.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const decrypted = decryptedMessages[msg.id];
                const isSender = msg.sender_codename === chat.codename_a;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isSender ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded border ${
                        isSender
                          ? 'bg-secondary border-border'
                          : 'bg-accent/10 border-accent'
                      }`}
                    >
                      {msg.deleted ? (
                        <p className="text-xs text-muted-foreground italic">
                          [DELETED]
                        </p>
                      ) : decrypted ? (
                        <>
                          <p className="text-xs text-muted-foreground mb-1">
                            {msg.sender_codename} •{' '}
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                          <p className="text-sm break-words">{decrypted}</p>
                          {/* TODO: Show images here */}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          🔒 Cannot decrypt
                        </p>
                      )}
                    </div>
                    {/* Delete button */}
                    {decrypted && !msg.deleted && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 hover:bg-secondary rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border px-6 py-4 space-y-3">
            {error && (
              <div className="p-2 bg-destructive/10 border border-destructive rounded text-xs text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type message..."
                className="flex-1 px-4 py-2 bg-secondary border border-border rounded font-mono text-sm focus:border-accent focus:outline-none"
                disabled={sendingMessage}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="p-2 bg-secondary border border-border rounded hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Upload className="w-5 h-5" />
              </button>

              <button
                type="submit"
                disabled={!messageText.trim() || sendingMessage}
                className="px-4 py-2 bg-accent text-primary font-mono font-semibold rounded border border-accent hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {sendingMessage ? '...' : 'SEND'}
              </button>
            </form>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => handleImageSelected(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>
        </>
      )}
    </div>
  );
}
