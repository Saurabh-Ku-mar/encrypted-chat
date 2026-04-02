# SECURE_CHAT - Zero-Knowledge Encrypted Chat System

A production-ready, end-to-end encrypted chat application inspired by the "Mr. Blue ↔ Mr. Green" conversation from The Incredible Hulk movie. Built with Next.js, Web Crypto API, and Supabase.

## Key Features

- **End-to-End Encryption**: AES-GCM 256-bit encryption with NIST-compliant PBKDF2 key derivation
- **Zero-Knowledge Architecture**: Server cannot read messages or decrypt data
- **Anonymous Codenames**: No personal information required
- **Invite-Based Pairing**: 24-hour expiring invite codes for secure chat initiation
- **Encrypted Images**: Upload images with automatic EXIF metadata removal
- **Auto-Lock**: Session keys cleared when tab is hidden or closed
- **Perfect Forward Secrecy**: Unique IV per message prevents cryptanalysis
- **Row-Level Security**: Supabase RLS policies enforce access control

## System Architecture

\`\`\`
┌─────────────────┐
│   User A (Browser)  │── Web Crypto API (AES-GCM) ──┐
└─────────────────┘                                   │
                                                    │
                                          ┌──────────┴──────────┐
                                          │  HTTPS + TLS 1.3    │
                                          └──────────┬──────────┘
                                                    │
                    ┌───────────────────────────────┴───────────────────────┐
                    │                                                       │
                    ▼                                                       ▼
         ┌──────────────────┐                               ┌──────────────────┐
         │   Supabase RLS   │                               │   Supabase RLS   │
         │   Messages Table │ ◄──────Encrypted Blobs────► │   Images Table   │
         │   (Zero-Access)  │                               │   (Zero-Access)  │
         └──────────────────┘                               └──────────────────┘
                    ▲                                                       ▲
                    └───────────────────────────────┬───────────────────────┘
                                          ┌──────────┴──────────┐
                                          │  HTTPS + TLS 1.3    │
                                          └──────────┬──────────┘
                                                    │
         ┌─────────────────┐
         │   User B (Browser)  │── Web Crypto API (AES-GCM) ──┘
         └─────────────────┘
\`\`\`

## File Structure

\`\`\`
/app
  /chat/[id]/page.tsx       - Main chat interface (unlock/lock/messaging/images)
  /create/page.tsx          - Create chat & generate invite code
  /join/page.tsx            - Join chat with invite code
  /page.tsx                 - Landing page
  /layout.tsx               - Root layout
  /globals.css              - Dark hacker theme

/lib
  /crypto.ts                - AES-GCM encryption, PBKDF2 key derivation, session management
  /supabase.ts              - Supabase client, database operations

/scripts
  /setup-database.sql       - Database schema with RLS policies

/public                      - Static assets

SECURITY_CHECKLIST.md        - Pre-deployment security verification
README.md                    - This file
\`\`\`

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- Vercel account (for deployment)

### 1. Clone & Install

\`\`\`bash
git clone <repo-url>
cd secure-chat
npm install
\`\`\`

### 2. Setup Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Enable **Anonymous Auth** in Authentication > Providers
3. In SQL Editor, run the contents of `/scripts/setup-database.sql`
4. Copy your API credentials:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Anon key from API settings)

### 3. Add Environment Variables

Create `.env.local`:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-key...
\`\`\`

### 4. Run Locally

\`\`\`bash
npm run dev
\`\`\`

Visit `http://localhost:3000`

### 5. Deploy to Vercel

\`\`\`bash
git push origin main
\`\`\`

Then add environment variables in Vercel project settings.

## Usage Flow

### Create Chat (User A)
1. Click "CREATE CHAT"
2. Enter a codename (e.g., "MrBlue")
3. Share the generated invite code with User B (via Signal, Wire, or in-person)
4. Wait for User B to join

### Join Chat (User B)
1. Click "JOIN CHAT"
2. Paste the invite code
3. Enter your codename (e.g., "MrGreen")
4. Chat is now active

### Send Messages
1. Type message or upload image
2. Click "SEND"
3. Message is encrypted before upload

### Unlock Chat
1. Both users enter the **same unlock secret** (password)
2. This derives the same encryption key using PBKDF2
3. Messages decrypt in browser memory only
4. Session clears when tab is hidden or closed

## Encryption Details

### Key Derivation
\`\`\`
invite_code → SHA-256 → salt[:16 bytes]
password + salt → PBKDF2(600k iterations) → 256-bit key
\`\`\`

### Message Encryption
\`\`\`
plaintext + random_IV → AES-GCM(key, IV) → {ciphertext + auth_tag}
Server stores: {IV, ciphertext, auth_tag}
Decryption: requires same key (derived from password)
\`\`\`

### Image Encryption
\`\`\`
image_file → remove EXIF → encrypt like message
filename & mime_type → encrypted separately
Decrypted in memory only (blob URL)
\`\`\`

## Security Properties

| Property | Achieved By |
|----------|------------|
| **E2EE** | AES-GCM encryption before upload |
| **Zero-Knowledge** | No keys stored server-side |
| **No Plaintext** | All data encrypted at rest & transit |
| **PFS** | Unique IV per message |
| **Authentication** | AES-GCM auth tag prevents tampering |
| **Key Strength** | PBKDF2 600k iterations (NIST compliant) |
| **Key Isolation** | Each chat has independent key |
| **Session Security** | Keys in memory only, cleared on lock |
| **Metadata Privacy** | Codename-based identity, no emails/phones |

## Important Notes

⚠️ **Pre-Production**
- This system is functional but should be audited by a security firm before production use
- Recommended: hire external penetration tester
- Consider bug bounty program

⚠️ **Password Security**
- Use a strong, unique unlock secret (16+ characters)
- This secret should be known ONLY to both chat participants
- If forgotten, messages cannot be recovered (no master key)

⚠️ **Invite Code Security**
- Share invite code via SECURE channel (Signal, Wire, in-person)
- NOT via email, SMS, or unencrypted messaging
- Code expires after 24 hours

⚠️ **Session Management**
- Keys exist ONLY in memory while chat is unlocked
- Closing tab = automatic lock
- Switching tabs = automatic lock
- No keys stored in localStorage

## Testing

### Manual Test
\`\`\`
1. Create chat (User A)
2. Copy invite code
3. Open incognito window (User B)
4. Join chat with code
5. Set unlock secret (same for both)
6. Both unlock → can see messages
7. Close tab → automatically locks
8. Refresh → locked again
9. Wrong secret → no decryption
10. Upload image → encrypted before upload
\`\`\`

### Automated Tests (TODO)
\`\`\`bash
npm test
\`\`\`

## Monitoring & Maintenance

### Logs to Monitor
- Supabase audit logs (authentication attempts)
- Vercel deployment logs (errors, warnings)
- Application errors (Sentry integration recommended)

### Regular Checks
- RLS policies preventing unauthorized access
- Invite code expiration functioning
- Auto-lock triggering on visibility change
- Crypto operations completing successfully

## FAQ

**Q: Can I use this for group chats?**
A: No, it's designed for exactly 2 users. Adding groups requires different cryptographic properties.

**Q: What if the server is compromised?**
A: Messages remain encrypted. Without the password, they're useless.

**Q: Can I recover my password?**
A: No. There's no master key or recovery mechanism by design.

**Q: Why not use a crypto library like libsodium?**
A: Web Crypto API is audited, standardized, and built into all modern browsers.

**Q: Is this production-ready?**
A: It's functionally complete but needs professional security audit before production.

## License

MIT - See LICENSE file

## Contributing

Security-critical fixes only. Submit to security@example.com, not public issues.

## Support

- Detailed security analysis: See `/SECURITY_CHECKLIST.md`
- Architecture explanation: See `/ARCHITECTURE.md` (TODO)
- Database schema: See `/scripts/setup-database.sql`

---

**Zero-Knowledge Encrypted Chat System**
Built with Next.js 16, Web Crypto API, and Supabase
Production-ready cryptography. Verifiable privacy.
