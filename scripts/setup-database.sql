-- ==================================================
-- ENCRYPTED CHAT SYSTEM - DATABASE SCHEMA
-- Supabase/PostgreSQL
-- ==================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================================================
-- 1. CHATS TABLE (Metadata only - zero-knowledge)
-- ==================================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID NOT NULL,
  user_b UUID,
  codename_a VARCHAR(50) NOT NULL,
  codename_b VARCHAR(50),
  invite_code_hash TEXT NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invite_expires_at TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Encrypted KEK storage (future enhancement)
  encrypted_key_storage TEXT,
  
  CONSTRAINT status_check CHECK (status IN ('waiting', 'active', 'closed'))
);

CREATE INDEX idx_chats_user_a ON chats(user_a);
CREATE INDEX idx_chats_user_b ON chats(user_b) WHERE user_b IS NOT NULL;
CREATE INDEX idx_chats_invite_hash ON chats(invite_code_hash);
CREATE INDEX idx_chats_status ON chats(status);

-- ==================================================
-- 2. IMAGES TABLE (Encrypted binary data)
-- ==================================================
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL,
  
  -- Encrypted image data
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  
  -- Encrypted metadata
  encrypted_filename TEXT NOT NULL,
  encrypted_mime_type TEXT NOT NULL,
  
  -- Unencrypted metadata (for DB operations)
  file_size_encrypted INT NOT NULL,
  original_filename VARCHAR(255),
  
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_images_chat_id ON images(chat_id);
CREATE INDEX idx_images_uploader ON images(uploader_id);

-- ==================================================
-- 3. MESSAGES TABLE (Encrypted content only)
-- ==================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_codename VARCHAR(50) NOT NULL,
  
  -- Encrypted message fields
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  additional_data TEXT NOT NULL,
  
  -- Metadata (not encrypted - needed for queries)
  message_type VARCHAR(50) NOT NULL DEFAULT 'text',
  image_id UUID REFERENCES images(id) ON DELETE SET NULL,
  
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited BOOLEAN DEFAULT FALSE,
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- ==================================================
-- 4. INVITES TABLE (Temporary pairing data)
-- ==================================================
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_code_hash TEXT NOT NULL UNIQUE,
  creator_id UUID NOT NULL,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
  
  CONSTRAINT invite_status_check CHECK (status IN ('pending', 'accepted', 'expired'))
);

CREATE INDEX idx_invites_code_hash ON invites(invite_code_hash);
CREATE INDEX idx_invites_creator ON invites(creator_id);
CREATE INDEX idx_invites_expires ON invites(expires_at);

-- ==================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==================================================

-- Enable RLS on all tables
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- CHATS: Users can only see their own chats
CREATE POLICY "Users can view their own chats"
  ON chats FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can create chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = user_a);

CREATE POLICY "Users can update their own chats"
  ON chats FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- MESSAGES: Only members of a chat can read/write messages
CREATE POLICY "Chat members can read messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.user_a = auth.uid() OR chats.user_b = auth.uid())
    )
  );

CREATE POLICY "Chat members can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.user_a = auth.uid() OR chats.user_b = auth.uid())
    )
  );

CREATE POLICY "Messages are immutable (no update)"
  ON messages FOR UPDATE
  USING (FALSE);

CREATE POLICY "Only sender can soft-delete own message"
  ON messages FOR DELETE
  USING (sender_id = auth.uid());

-- IMAGES: Only chat members can access images
CREATE POLICY "Chat members can read images"
  ON images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = images.chat_id
      AND (chats.user_a = auth.uid() OR chats.user_b = auth.uid())
    )
  );

CREATE POLICY "Chat members can upload images"
  ON images FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = images.chat_id
      AND (chats.user_a = auth.uid() OR chats.user_b = auth.uid())
    )
  );

CREATE POLICY "Images are immutable"
  ON images FOR DELETE
  USING (FALSE);

-- INVITES: Only creator can view their invites
CREATE POLICY "Users can view their invites"
  ON invites FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can create invites"
  ON invites FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- ==================================================
-- END OF SCHEMA
-- ==================================================
