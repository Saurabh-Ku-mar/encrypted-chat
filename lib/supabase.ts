/**
 * ENCRYPTED CHAT - SUPABASE DATABASE CLIENT
 * Zero-knowledge backend - handles only encrypted data and metadata
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Chat {
  id: string;
  user_a: string;
  user_b: string | null;
  codename_a: string;
  codename_b: string | null;
  invite_code_hash: string;
  status: 'waiting' | 'active' | 'closed';
  created_at: string;
  invite_expires_at: string;
  last_activity: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_codename: string;
  iv: string;
  ciphertext: string;
  auth_tag: string;
  additional_data: string;
  message_type: 'text' | 'image';
  image_id: string | null;
  timestamp: string;
  created_at: string;
  edited: boolean;
  deleted: boolean;
}

export interface ImageRecord {
  id: string;
  chat_id: string;
  uploader_id: string;
  iv: string;
  ciphertext: string;
  auth_tag: string;
  encrypted_filename: string;
  encrypted_mime_type: string;
  file_size_encrypted: number;
  original_filename: string | null;
  timestamp: string;
  created_at: string;
}

export interface Invite {
  id: string;
  invite_code_hash: string;
  creator_id: string;
  chat_id: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
}

// ============================================
// CHAT OPERATIONS
// ============================================

/**
 * Create a new chat (User A only)
 */
export async function createChat(
  userId: string,
  codenameA: string,
  inviteCodeHash: string
): Promise<Chat | null> {
  console.log('[v0] Creating new chat...');

  try {
    const { data, error } = await supabase
      .from('chats')
      .insert([
        {
          user_a: userId,
          codename_a: codenameA,
          invite_code_hash: inviteCodeHash,
          status: 'waiting',
          invite_expires_at: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[v0] Chat creation error:', error);
      return null;
    }

    console.log('[v0] Chat created:', data.id);
    return data as Chat;
  } catch (error) {
    console.error('[v0] Chat creation exception:', error);
    return null;
  }
}

/**
 * Validate invite code and get chat
 */
export async function validateInviteCode(
  inviteCodeHash: string
): Promise<Chat | null> {
  console.log('[v0] Validating invite code...');

  try {
    const { data, error } = await supabase
      .from('chats')
      .select()
      .eq('invite_code_hash', inviteCodeHash)
      .eq('status', 'waiting')
      .gt('invite_expires_at', new Date().toISOString())
      .single();

    if (error) {
      console.error('[v0] Invalid or expired invite code:', error);
      return null;
    }

    console.log('[v0] Invite code valid');
    return data as Chat;
  } catch (error) {
    console.error('[v0] Invite validation exception:', error);
    return null;
  }
}

/**
 * Join existing chat (User B)
 */
export async function joinChat(
  chatId: string,
  userId: string,
  codenameB: string
): Promise<Chat | null> {
  console.log('[v0] User B joining chat...');

  try {
    const { data, error } = await supabase
      .from('chats')
      .update({
        user_b: userId,
        codename_b: codenameB,
        status: 'active',
      })
      .eq('id', chatId)
      .select()
      .single();

    if (error) {
      console.error('[v0] Join chat error:', error);
      return null;
    }

    console.log('[v0] User B joined chat');
    return data as Chat;
  } catch (error) {
    console.error('[v0] Join chat exception:', error);
    return null;
  }
}

/**
 * Get chat by ID (with RLS verification)
 */
export async function getChat(chatId: string): Promise<Chat | null> {
  console.log('[v0] Fetching chat...');

  try {
    const { data, error } = await supabase
      .from('chats')
      .select()
      .eq('id', chatId)
      .single();

    if (error) {
      console.error('[v0] Get chat error:', error);
      return null;
    }

    return data as Chat;
  } catch (error) {
    console.error('[v0] Get chat exception:', error);
    return null;
  }
}

/**
 * Get user's chats
 */
export async function getUserChats(userId: string): Promise<Chat[]> {
  console.log('[v0] Fetching user chats...');

  try {
    const { data, error } = await supabase
      .from('chats')
      .select()
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);

    if (error) {
      console.error('[v0] Get chats error:', error);
      return [];
    }

    return data as Chat[];
  } catch (error) {
    console.error('[v0] Get chats exception:', error);
    return [];
  }
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

/**
 * Send encrypted message
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  senderCodename: string,
  iv: string,
  ciphertext: string,
  authTag: string,
  additionalData: string,
  messageType: 'text' | 'image' = 'text',
  imageId: string | null = null
): Promise<Message | null> {
  console.log('[v0] Sending message...');

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          sender_id: senderId,
          sender_codename: senderCodename,
          iv,
          ciphertext,
          auth_tag: authTag,
          additional_data: additionalData,
          message_type: messageType,
          image_id: imageId,
          timestamp: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[v0] Send message error:', error);
      return null;
    }

    console.log('[v0] Message sent');
    return data as Message;
  } catch (error) {
    console.error('[v0] Send message exception:', error);
    return null;
  }
}

/**
 * Get all messages for a chat (encrypted)
 */
export async function getMessages(chatId: string): Promise<Message[]> {
  console.log('[v0] Fetching messages...');

  try {
    const { data, error } = await supabase
      .from('messages')
      .select()
      .eq('chat_id', chatId)
      .eq('deleted', false)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('[v0] Get messages error:', error);
      return [];
    }

    return data as Message[];
  } catch (error) {
    console.error('[v0] Get messages exception:', error);
    return [];
  }
}

/**
 * Subscribe to new messages in real-time
 */
export function subscribeToMessages(
  chatId: string,
  callback: (message: Message) => void
): (() => void) {
  console.log('[v0] Subscribing to messages...');

  const subscription = supabase
    .from(`messages:chat_id=eq.${chatId}`)
    .on('*', (payload) => {
      if (payload.eventType === 'INSERT') {
        callback(payload.new as Message);
      }
    })
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeSubscription(subscription);
    console.log('[v0] Unsubscribed from messages');
  };
}

/**
 * Soft delete message (mark as deleted)
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
  console.log('[v0] Deleting message...');

  try {
    const { error } = await supabase
      .from('messages')
      .update({ deleted: true })
      .eq('id', messageId);

    if (error) {
      console.error('[v0] Delete message error:', error);
      return false;
    }

    console.log('[v0] Message deleted');
    return true;
  } catch (error) {
    console.error('[v0] Delete message exception:', error);
    return false;
  }
}

// ============================================
// IMAGE OPERATIONS
// ============================================

/**
 * Upload encrypted image metadata and data
 */
export async function uploadImage(
  chatId: string,
  uploaderId: string,
  iv: string,
  ciphertext: string,
  authTag: string,
  encryptedFilename: string,
  encryptedMimeType: string,
  fileSizeEncrypted: number,
  originalFilename?: string
): Promise<ImageRecord | null> {
  console.log('[v0] Uploading encrypted image...');

  try {
    const { data, error } = await supabase
      .from('images')
      .insert([
        {
          chat_id: chatId,
          uploader_id: uploaderId,
          iv,
          ciphertext,
          auth_tag: authTag,
          encrypted_filename: encryptedFilename,
          encrypted_mime_type: encryptedMimeType,
          file_size_encrypted: fileSizeEncrypted,
          original_filename: originalFilename,
          timestamp: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[v0] Image upload error:', error);
      return null;
    }

    console.log('[v0] Image uploaded');
    return data as ImageRecord;
  } catch (error) {
    console.error('[v0] Image upload exception:', error);
    return null;
  }
}

/**
 * Get images for a chat
 */
export async function getImages(chatId: string): Promise<ImageRecord[]> {
  console.log('[v0] Fetching images...');

  try {
    const { data, error } = await supabase
      .from('images')
      .select()
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('[v0] Get images error:', error);
      return [];
    }

    return data as ImageRecord[];
  } catch (error) {
    console.error('[v0] Get images exception:', error);
    return [];
  }
}

/**
 * Get single image by ID
 */
export async function getImage(imageId: string): Promise<ImageRecord | null> {
  console.log('[v0] Fetching image...');

  try {
    const { data, error } = await supabase
      .from('images')
      .select()
      .eq('id', imageId)
      .single();

    if (error) {
      console.error('[v0] Get image error:', error);
      return null;
    }

    return data as ImageRecord;
  } catch (error) {
    console.error('[v0] Get image exception:', error);
    return null;
  }
}

// ============================================
// AUTHENTICATION HELPERS
// ============================================

/**
 * Get current user session
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[v0] Session error:', error);
    return null;
  }
  return data.session;
}

/**
 * Sign in anonymously
 */
export async function signInAnonymously() {
  console.log('[v0] Signing in anonymously...');
  console.log('[v0] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  try {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.error('[v0] Anonymous sign-in error:', error.message);
      console.error('[v0] Error details:', error);
      return null;
    }

    console.log('[v0] Anonymous sign-in successful');
    return data.session;
  } catch (err: any) {
    console.error('[v0] Anonymous sign-in exception:', err);
    console.error('[v0] Exception message:', err?.message);
    console.error('[v0] Full error:', err);
    throw err;
  }
}

/**
 * Sign out
 */
export async function signOut() {
  console.log('[v0] Signing out...');

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[v0] Sign out error:', error);
    return false;
  }

  console.log('[v0] Sign out successful');
  return true;
}

export default {
  createChat,
  validateInviteCode,
  joinChat,
  getChat,
  getUserChats,
  sendMessage,
  getMessages,
  subscribeToMessages,
  deleteMessage,
  uploadImage,
  getImages,
  getImage,
  getCurrentSession,
  signInAnonymously,
  signOut,
};
