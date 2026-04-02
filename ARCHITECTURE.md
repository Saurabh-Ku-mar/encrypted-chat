# ENCRYPTED CHAT SYSTEM - DETAILED ARCHITECTURE

## Table of Contents
1. [System Overview](#system-overview)
2. [Cryptographic Design](#cryptographic-design)
3. [Database Schema](#database-schema)
4. [Security Model](#security-model)
5. [API Flows](#api-flows)
6. [Threat Model & Mitigations](#threat-model--mitigations)

---

## System Overview

### Technology Stack
- **Frontend**: Next.js 16 (React 19.2) with TypeScript
- **Encryption**: Web Crypto API (AES-GCM, PBKDF2)
- **Backend**: Supabase (PostgreSQL) with Row-Level Security
- **Auth**: Supabase Anonymous Auth
- **Deployment**: Vercel (HTTPS enforced)
- **Storage**: Supabase (encrypted data only)

### Design Principles
1. **Zero-Knowledge**: Server cannot access plaintext
2. **End-to-End Encryption**: Only intended users decrypt
3. **Stateless Clients**: No persistent keys
4. **Immutable Messages**: No edit/delete (only soft-delete)
5. **Anonymous Identity**: Codenames only, no PII
6. **Minimal Trust**: Trust only cryptography, not humans

### Threat Model
- **Adversary 1**: Man-in-the-middle (MITRE)
- **Adversary 2**: Server compromise (insider threat)
- **Adversary 3**: Database dump (data breach)
- **Adversary 4**: Password guesser (weak secret)
- **Adversary 5**: XSS attack (client compromise)

---

## Cryptographic Design

### 1. Key Derivation (PBKDF2)

\`\`\`
┌─────────────────────────────────────┐
│  Invite Code (32 random bytes)      │
│  e.g., "4TpxE3m7K9...zL2pQ"        │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────────────┐
        │   SHA-256    │
        │   Hash       │
        └──────┬───────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Hash Output (32 bytes)             │
│  Use first 16 bytes as SALT         │
└──────────────┬──────────────────────┘
               │
        ┌──────┴────────┐
        │               │
   ┌────▼─────┐    ┌────▼──────────────┐
   │ Password  │    │ Salt (16 bytes)   │
   │ "secret"  │    │ (from code)       │
   └────┬─────┘    └────┬──────────────┘
        │                │
        └────────┬───────┘
                 │
                 ▼
        ┌──────────────────┐
        │  PBKDF2-SHA256   │
        │  600,000 iter.   │
        │  32 bytes output │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │  256-bit KEK     │
        │  (Master Key)    │
        └──────────────────┘
\`\`\`

**Why PBKDF2?**
- NIST SP 800-132 recommended
- 600,000 iterations = ~100ms on modern hardware
- Resists GPU/ASIC brute-force attacks
- Simpler than Argon2, fully supported by Web Crypto API

### 2. Message Encryption (AES-GCM)

\`\`\`
┌──────────────────────────────┐
│  Plaintext Message           │
│  "Hello Mr. Green"           │
└────────────┬─────────────────┘
             │
      ┌──────┴──────────┐
      │                 │
 ┌────▼─────┐      ┌────▼──────────────┐
 │  KEK      │      │  Random IV        │
 │  (from    │      │  (12 bytes)       │
 │ PBKDF2)   │      │  CSPRNG           │
 └────┬─────┘      └────┬──────────────┘
      │                 │
      │          ┌──────┴────────┐
      │          │               │
      │     ┌────▼────┐    ┌─────▼─────────┐
      │     │  IV     │    │ AAD (Additional│
      │     │         │    │ Authenticated  │
      │     │         │    │ Data)          │
      │     │         │    │ timestamp:     │
      │     │         │    │ sender_id      │
      │     │         │    └─────┬──────────┘
      │     └────┬────┘          │
      │          │               │
      └──────────┬───────────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │  AES-GCM Encrypt     │
        │  - Ensures AEAD      │
        │  - Generates auth    │
        │    tag (128-bit)     │
        └────────┬─────────────┘
                 │
                 ▼
    ┌──────────────────────────────┐
    │  Ciphertext (variable len)   │
    │  + Auth Tag (16 bytes)       │
    │  + IV (12 bytes) [sent]      │
    └──────────────────────────────┘
\`\`\`

**AES-GCM Properties:**
- Confidentiality: AES encryption
- Authenticity: GHASH message authentication code
- No ciphertext tampering possible (tag verification)
- Nonce = IV (ensures uniqueness)
- No padding needed

### 3. Session Key Storage

\`\`\`
BROWSER SESSION (Memory Only)
┌─────────────────────────────────────┐
│  globalThis.SESSION_KEY_{chatId}    │
│  = CryptoKey object                 │
│  - Non-extractable                  │
│  - Volatile (cleared on reload)     │
│  - Not accessible via JS directly   │
└─────────────────────────────────────┘

NOT STORED IN:
✗ localStorage (persistent, XSS-readable)
✗ sessionStorage (slightly better, still readable)
✗ IndexedDB (persistent, XSS-readable)
✗ Cookies (sent to server, readable)

AUTO-CLEARED ON:
• Tab visibility hidden
• Tab/window closed
• Manual lock button
• Refresh page
\`\`\`

---

## Database Schema

### Table: chats

\`\`\`sql
CREATE TABLE chats (
  id UUID PRIMARY KEY,
  user_a UUID NOT NULL,
  user_b UUID,                      -- NULL until User B joins
  codename_a VARCHAR(50),
  codename_b VARCHAR(50),
  invite_code_hash TEXT UNIQUE,     -- SHA-256(code), NOT code itself
  status VARCHAR(50),               -- waiting, active, closed
  created_at TIMESTAMP,
  invite_expires_at TIMESTAMP,      -- 24 hours from creation
  last_activity TIMESTAMP
);
\`\`\`

**Why no plaintext invite code?**
- Hash prevents database dump from revealing codes
- Protects against database administrator access
- Still allows validation via hash comparison

### Table: messages

\`\`\`sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id),
  sender_id UUID NOT NULL,
  sender_codename VARCHAR(50),
  iv TEXT NOT NULL,                 -- Base64(12 random bytes)
  ciphertext TEXT NOT NULL,         -- Base64(AES-GCM encrypted)
  auth_tag TEXT NOT NULL,           -- Base64(16-byte GHASH tag)
  additional_data TEXT NOT NULL,    -- Base64(AAD: timestamp:sender)
  message_type VARCHAR(50),         -- 'text' or 'image'
  image_id UUID REFERENCES images,  -- NULL for text messages
  timestamp TIMESTAMP,
  edited BOOLEAN,                   -- Always FALSE (immutable)
  deleted BOOLEAN                   -- Soft delete flag
);
\`\`\`

**Encryption at rest?**
- Text fields are encrypted in transit (HTTPS/TLS)
- Server-side encryption at rest (Supabase) optional
- Messages are encrypted before reaching server

### Table: images

\`\`\`sql
CREATE TABLE images (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id),
  uploader_id UUID NOT NULL,
  iv TEXT NOT NULL,                 -- Base64(12 random bytes)
  ciphertext TEXT NOT NULL,         -- Base64(encrypted image bytes)
  auth_tag TEXT NOT NULL,           -- Base64(GHASH tag)
  encrypted_filename TEXT,          -- Encrypted via AES-GCM
  encrypted_mime_type TEXT,         -- Encrypted via AES-GCM
  file_size_encrypted INT,          -- Size of ciphertext
  timestamp TIMESTAMP
);
\`\`\`

**Why encrypt filename & mime type?**
- Prevents metadata inference (file type patterns)
- Even encrypted data size can leak info
- Decrypted only in memory when needed

### Table: invites (Temporary)

\`\`\`sql
CREATE TABLE invites (
  id UUID PRIMARY KEY,
  invite_code_hash TEXT UNIQUE,     -- SHA-256(code)
  creator_id UUID NOT NULL,
  chat_id UUID NOT NULL REFERENCES chats(id),
  status VARCHAR(50),               -- pending, accepted, expired
  created_at TIMESTAMP,
  expires_at TIMESTAMP              -- Automatic cleanup
);
\`\`\`

---

## Security Model

### Row-Level Security (RLS) Policies

#### Chat Visibility
\`\`\`sql
-- User can only see chats they're a member of
CREATE POLICY chat_member_access ON chats
  FOR SELECT
  USING (auth.uid() IN (user_a, user_b))
\`\`\`

#### Message Access
\`\`\`sql
-- User can read messages only in chats they're in
CREATE POLICY message_member_access ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.user_a = auth.uid() OR chats.user_b = auth.uid())
    )
  )

-- User can only send messages to chats they're in
CREATE POLICY message_send ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_id
      AND (chats.user_a = auth.uid() OR chats.user_b = auth.uid())
    )
  )

-- Messages are immutable (no updates)
CREATE POLICY message_immutable ON messages
  FOR UPDATE
  USING (FALSE)
\`\`\`

#### Image Access
\`\`\`sql
-- Same as messages (RLS enforced at database layer)
\`\`\`

### Trust Boundaries

\`\`\`
┌──────────────────────────────────────────────────┐
│ UNTRUSTED                                         │
│ • Network (intercepted, replayed)                │
│ • Server (compromised admin, insider)            │
│ • Database (dumped, stolen)                      │
│ • Browser plugins (malicious)                    │
│ • User device (other processes)                  │
└──────────────────────────────────────────────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │ CRYPTOGRAPHIC BOUNDARY    │
        │ (AES-GCM, PBKDF2)        │
        └───────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ TRUSTED (only when correctly implemented)        │
│ • Messages encrypted & authenticated             │
│ • Keys never leave memory                        │
│ • Session cleared on tab/window close            │
│ • Password entropy high (16+ chars)              │
└──────────────────────────────────────────────────┘
\`\`\`

---

## API Flows

### 1. Create Chat Flow

\`\`\`
User A                                    Server
   │                                        │
   ├─ Click "CREATE CHAT"                  │
   ├─ Enter codename "MrBlue"              │
   │                                        │
   ├─ Generate invite code (32 bytes)      │
   ├─ Hash = SHA256(code)                  │
   │                                        │
   ├─ Sign in anonymously ────────────────►│
   │                                        │ Anonymous Auth
   │◄──── Firebase UID + session ──────────┤
   │                                        │
   ├─ POST /api/chats ────────────────────►│
   │   {                                    │
   │     user_a: uid,                      │
   │     codename_a: "MrBlue",             │
   │     invite_code_hash: "abc123..."    │
   │   }                                    │
   │                                        │
   │◄──── Chat created (id: "chat123") ────┤
   │                                        │
   ├─ Store in sessionStorage:             │
   │   invite_{chat123} = "4TpxE3m7K9..."│
   │                                        │
   └─ Display invite code to User A        │
     (Share via Signal/Wire/in-person)
\`\`\`

### 2. Join Chat Flow

\`\`\`
User B                                    Server
   │                                        │
   ├─ Click "JOIN CHAT"                    │
   ├─ Paste invite code                    │
   │                                        │
   ├─ Hash = SHA256(code) ──────────────► │
   │                                        │
   ├─ GET /api/chats/validate ────────────►│
   │   { invite_code_hash: "abc123..." }   │
   │                                        │
   │◄──── Chat exists & not expired ───────┤
   │      (codename_a: "MrBlue")          │
   │                                        │
   ├─ Store code in sessionStorage         │
   ├─ Enter codename "MrGreen"             │
   │                                        │
   ├─ Sign in anonymously ────────────────►│
   │                                        │
   │◄──── Firebase UID + session ──────────┤
   │                                        │
   ├─ PUT /api/chats/{id} ────────────────►│
   │   {                                    │
   │     user_b: uid,                      │
   │     codename_b: "MrGreen",            │
   │     status: "active"                  │
   │   }                                    │
   │                                        │
   │◄──── Chat updated ─────────────────────┤
   │                                        │
   └─ Redirect to /chat/{id}
     (both users can now message)
\`\`\`

### 3. Unlock & Decrypt Flow

\`\`\`
User A (in chat)                          Server
   │                                        │
   ├─ Chat locked, enter unlock secret     │
   │                                        │
   ├─ Get invite code from sessionStorage  │
   ├─ salt = SHA256(code)[:16]             │
   ├─ key = PBKDF2(secret, salt, 600k)     │
   │                                        │
   ├─ GET /api/messages/{chat_id} ───────►│
   │                                        │
   │◄──── Encrypted messages ───────────────┤
   │      {                                 │
   │        id, iv, ciphertext,            │
   │        auth_tag, additional_data      │
   │      }[]                              │
   │                                        │
   ├─ For each message:                    │
   │   plaintext = AES-GCM.decrypt(        │
   │     key=derived_key,                  │
   │     iv=message.iv,                    │
   │     ct=message.ciphertext,            │
   │     tag=message.auth_tag,             │
   │     aad=message.additional_data       │
   │   )                                    │
   │                                        │
   │   If decrypt fails: show lock icon    │
   │   If decrypt succeeds: show message   │
   │                                        │
   └─ All messages now visible
     (keys in memory, cleared on tab close)
\`\`\`

### 4. Send Message Flow

\`\`\`
User A (unlocked)                         Server
   │                                        │
   ├─ Type "Hello Mr. Green"               │
   ├─ Click SEND                           │
   │                                        │
   ├─ key = getSessionKey(chatId)          │
   │   (from globalThis memory)            │
   │                                        │
   ├─ Generate random IV (12 bytes)        │
   ├─ iv = CSPRNG                          │
   │                                        │
   ├─ aad = "timestamp:sender_id"          │
   │                                        │
   ├─ ciphertext = AES-GCM.encrypt(        │
   │   key, plaintext, iv, aad             │
   │ )                                      │
   │                                        │
   ├─ POST /api/messages ─────────────────►│
   │   {                                    │
   │     chat_id: "chat123",                │
   │     sender_id: uid,                    │
   │     iv: base64(iv),                   │
   │     ciphertext: base64(ct),           │
   │     auth_tag: base64(tag),            │
   │     additional_data: base64(aad),     │
   │     message_type: "text"              │
   │   }                                    │
   │                                        │
   │◄──── Message stored (encrypted) ──────┤
   │                                        │
   ├─ Update UI                            │
   │   (show in decrypted form locally)    │
   │                                        │
   └─ User B receives via subscription
     (tries to decrypt if unlocked)
\`\`\`

### 5. Image Upload Flow

\`\`\`
User A (unlocked)                         Server
   │                                        │
   ├─ Select image file (photo.jpg)        │
   │                                        │
   ├─ Validate:                            │
   │   ✓ JPEG or PNG only                  │
   │   ✓ < 5MB                             │
   │                                        │
   ├─ Remove EXIF metadata                 │
   │   (location, camera, timestamp, etc.) │
   │                                        │
   ├─ Read as ArrayBuffer                  │
   │                                        │
   ├─ Encrypt image data:                  │
   │   iv = CSPRNG (12 bytes)              │
   │   ciphertext = AES-GCM.encrypt(       │
   │     key, image_bytes, iv              │
   │   )                                    │
   │                                        │
   ├─ Encrypt filename & mime:             │
   │   enc_fname = AES-GCM.encrypt(        │
   │     key, "photo.jpg"                  │
   │   )                                    │
   │   enc_mime = AES-GCM.encrypt(         │
   │     key, "image/jpeg"                 │
   │   )                                    │
   │                                        │
   ├─ POST /api/images ───────────────────►│
   │   {                                    │
   │     chat_id: "chat123",                │
   │     uploader_id: uid,                 │
   │     iv, ciphertext, auth_tag,        │
   │     encrypted_filename,               │
   │     encrypted_mime_type               │
   │   }                                    │
   │                                        │
   │◄──── Image stored (encrypted) ────────┤
   │      (image_id: "img123")             │
   │                                        │
   ├─ Send message referencing image:      │
   │   POST /api/messages ─────────────────►│
   │   {                                    │
   │     message_type: "image",            │
   │     image_id: "img123",               │
   │     content: "[IMAGE: photo.jpg]"     │
   │   }                                    │
   │                                        │
   │◄──── Message sent ──────────────────────┤
   │                                        │
   └─ User B receives message
     (can download when unlocked)
\`\`\`

---

## Threat Model & Mitigations

### Threat 1: Man-in-the-Middle (MITM)

**Attack**: Attacker intercepts messages in transit

**Mitigation**:
- HTTPS enforced (Vercel redirects HTTP → HTTPS)
- TLS 1.3 minimum (Vercel enforced)
- Certificate pinning (optional, app-level check)
- Messages encrypted before transmission
- **Result**: ✓ MITIGATED

---

### Threat 2: Server Compromise

**Attack**: Admin/insider dumps database, reads messages

**Mitigation**:
- Server stores only encrypted blobs
- No encryption keys in database
- AES-GCM ciphertext unintelligible without key
- Key derived from user password, never transmitted
- **Result**: ✓ MITIGATED (unreadable)

---

### Threat 3: Database Breach

**Attack**: Attacker steals database dump, attempts decryption

**Mitigation**:
- Ciphertext only (no plaintext)
- PBKDF2 600k iterations (slow brute-force)
- Each chat has independent key
- 256-bit key space (2^256 possibilities)
- **Result**: ✓ MITIGATED (cost-prohibitive to brute-force)

---

### Threat 4: Weak Password

**Attack**: User chooses weak secret, attacker guesses password

**Mitigation**:
- Recommend 16+ character secrets
- Minimum entropy check (future: zxcvbn library)
- PBKDF2 still adds significant time/cost
- No online guessing (local key derivation)
- **Result**: ⚠️ PARTIALLY MITIGATED (user responsibility)

---

### Threat 5: XSS Attack

**Attack**: Attacker injects JavaScript, steals keys from memory

**Mitigation**:
- No `eval()` or `innerHTML` with user input
- Input sanitization on codenames
- Content Security Policy (CSP) headers recommended
- CryptoKey non-extractable (inaccessible via JS)
- **Result**: ✓ MITIGATED (by design & config)

---

### Threat 6: Nonce Reuse (IV Reuse)

**Attack**: Using same IV with same key breaks AES-GCM security

**Mitigation**:
- Random IV per message (CSPRNG)
- IV never reused (different message = new IV)
- IV not secret (transmitted with ciphertext)
- **Result**: ✓ MITIGATED (cryptographic guarantee)

---

### Threat 7: Ciphertext Tampering

**Attack**: Attacker modifies message in transit, hides alteration

**Mitigation**:
- AES-GCM includes authentication tag (16 bytes)
- Modified ciphertext fails tag verification
- Decryption raises exception (caught, shows lock icon)
- **Result**: ✓ MITIGATED (auth tag prevents tampering)

---

### Threat 8: Replay Attack

**Attack**: Attacker captures message, replays it later

**Mitigation**:
- AAD (Additional Authenticated Data) includes timestamp
- Modified AAD fails tag verification
- Timestamp prevents older messages passing as new
- **Result**: ✓ MITIGATED (AAD binding)

---

### Threat 9: Message Deletion Abuse

**Attack**: Attacker deletes messages to erase evidence

**Mitigation**:
- Soft delete (marked as deleted, not removed)
- Audit trail preserved (who deleted when)
- Immutable original data (no overwrites)
- **Result**: ✓ MITIGATED (forensics possible)

---

### Threat 10: Invite Code Exposure

**Attack**: Attacker intercepts invite code, joins chat

**Mitigation**:
- Invite code expires after 24 hours
- Code expires immediately after User B joins
- Code sent only once (User A shares manually)
- Code hash stored (not plaintext)
- **Result**: ✓ MITIGATED (time-limited, single-use)

---

## Deployment Checklist

- [ ] Supabase RLS policies enabled
- [ ] Anonymous auth provider enabled
- [ ] HTTPS redirects configured
- [ ] CSP headers added
- [ ] HSTS header enabled
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Backups automated
- [ ] Monitoring configured (Sentry)
- [ ] Security audit completed
- [ ] Penetration test passed
- [ ] Privacy policy published
- [ ] Vulnerability disclosure policy created

---

**Last Updated**: January 2024
**Version**: 1.0.0 (MVP)
**Status**: Ready for External Security Audit
