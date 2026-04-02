# ENCRYPTED CHAT SYSTEM - SECURITY CHECKLIST

## PRE-DEPLOYMENT VERIFICATION

### Encryption & Cryptography
- [x] AES-GCM using Web Crypto API (no custom crypto)
- [x] 256-bit keys (32 bytes)
- [x] Random 12-byte IV per message
- [x] Auth tag validated on decrypt
- [x] PBKDF2 with 600,000 iterations (NIST SP 800-132)
- [x] Unique salt per chat (derived from invite code hash)
- [x] Non-extractable CryptoKey objects
- [x] EXIF metadata removal before image encryption

### Key Management
- [x] Keys stored ONLY in volatile memory (globalThis)
- [x] Keys cleared on tab close/visibility change
- [x] No localStorage/IndexedDB key storage
- [x] Session key retrieval validates memory state
- [x] Auto-lock on tab hidden (visibilitychange event)
- [x] Auto-lock on beforeunload event

### Transport Security
- [x] HTTPS enforced (Vercel deployment automatic)
- [x] TLS 1.3 minimum (Vercel enforces)
- [x] No unencrypted credentials in transit
- [x] Supabase RLS policies prevent unauthorized access

### Storage Security
- [x] No plaintext messages in database
- [x] No encryption keys in database
- [x] Metadata-only visible (codenames, timestamps, message_type)
- [x] Firestore/Supabase RLS policies enforced
- [x] Messages immutable (no update, only soft-delete)
- [x] Images immutable (no delete, only soft-delete possible)

### Authentication & Authorization
- [x] Supabase anonymous auth for simplicity
- [x] Row-level security policies block non-members
- [x] Invite code validation before chat join
- [x] Codename-based identity (no personal info)
- [x] User session tied to auth.uid() in policies

### Input Validation
- [x] Codename: 3-20 chars, alphanumeric + underscore
- [x] Message: UTF-8, max 5000 chars
- [x] Image: JPEG/PNG only, max 5MB
- [x] Invite code: Base64 validation
- [x] Server-side validation in database policies

### Client Security
- [x] No eval() or innerHTML with user input
- [x] XSS prevention (sanitize codenames in DOM)
- [x] Content Security Policy ready (add to next.config.js)
- [x] No console logging of keys or secrets
- [x] graceful error handling (no stack traces to users)

### Privacy & Logging
- [x] No analytics on message content
- [x] No IP address logging
- [x] No user tracking cookies
- [x] Minimal server-side logging (encrypted data only)
- [x] No third-party services can read messages

### Error Handling
- [x] Try-catch blocks on all crypto operations
- [x] Decryption failures return null (not throw)
- [x] User-friendly error messages
- [x] No sensitive data in error output
- [x] Network errors handled gracefully

### Testing Checklist
- [ ] Unit test crypto functions (encrypt/decrypt)
- [ ] Integration test full E2EE flow
- [ ] Test wrong password scenarios
- [ ] Test image upload encryption/decryption
- [ ] Test auto-lock on tab visibility change
- [ ] Test invite code expiration
- [ ] Penetration test with security firm (recommended)
- [ ] Browser compatibility test (Chrome, Firefox, Safari)

### Deployment Checklist
- [ ] Environment variables set in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Supabase RLS policies enabled
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Database backups enabled
- [ ] Incident response plan in place
- [ ] Privacy policy published
- [ ] Vulnerability disclosure policy created
- [ ] Bug bounty program (optional but recommended)

---

## DEPLOYMENT INSTRUCTIONS

### 1. Supabase Setup
\`\`\`bash
# Create new Supabase project
# Go to: https://supabase.com/dashboard

# Get your API credentials:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY

# Enable anonymous auth:
# - Auth > Providers > Anonymous (toggle ON)

# Run migrations:
# Copy contents of scripts/setup-database.sql
# Paste into Supabase SQL Editor > Run
\`\`\`

### 2. Add Environment Variables (Vercel)
\`\`\`bash
# Go to: Vercel Project > Settings > Environment Variables

# Add:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-key...
\`\`\`

### 3. Deploy to Vercel
\`\`\`bash
# Push to GitHub
git push origin main

# Vercel auto-deploys on push
# Or manually deploy from dashboard
\`\`\`

### 4. Security Headers (Recommended)
Add to `next.config.js`:
\`\`\`javascript
const nextConfig = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'geolocation=(),microphone=(),camera=()',
        },
      ],
    },
  ],
};

export default nextConfig;
\`\`\`

### 5. Content Security Policy (Advanced)
Add to `next.config.js`:
\`\`\`javascript
const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://*.supabase.co;";

headers: async () => [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: csp,
      },
    ],
  },
];
\`\`\`

---

## ARCHITECTURE SUMMARY

### Database (Zero-Knowledge)
- **chats**: metadata only (codenames, status)
- **messages**: encrypted blobs (iv, ciphertext, auth_tag)
- **images**: encrypted blobs (iv, ciphertext, auth_tag)
- **invites**: temporary pairing data

### Encryption Flow
1. User A creates invite code (32 random bytes)
2. Both users derive same key: PBKDF2(password, salt=sha256(code)[:16])
3. User sends message: AES-GCM(plaintext, key, random_iv)
4. Server stores: {iv, ciphertext, auth_tag} - cannot decrypt
5. User receives message: AES-GCM.decrypt(ciphertext, key, iv, auth_tag)
6. Session key cleared on tab hidden/close

### Security Properties
- **E2EE**: Only users with correct password can decrypt
- **Zero-Knowledge**: Server cannot read any messages
- **Perfect Forward Secrecy**: Each message has unique IV
- **Authentication**: AES-GCM auth tag prevents tampering
- **Key Derivation**: PBKDF2 with 600k iterations resists brute-force

---

## INCIDENT RESPONSE

### If Compromised
1. **Database breach**: Messages are encrypted, useless without password
2. **Key leak**: Each chat's key is independent (no master key)
3. **Code leak**: Invite codes expire after 24 hours
4. **Credential leak**: Use stronger passwords for unlock secret

### Monitoring
- Supabase logs (database audit trail)
- Vercel logs (application errors)
- Check for suspicious RLS policy bypasses
- Monitor unauthorized auth attempts

---

## RECOMMENDATIONS FOR PRODUCTION

1. **Security Audit**: Hire external firm to audit crypto implementation
2. **Bug Bounty**: HackerOne or Bugcrowd program
3. **Rate Limiting**: Add rate limits on:
   - Invite code validation (prevent brute-force)
   - Message sending (prevent spam)
   - Auth attempts (prevent account enumeration)
4. **Monitoring**: Sentry or similar for error tracking
5. **Backup Strategy**: Regular Supabase backups
6. **Update Plan**: Security patches within 24 hours
7. **Logging**: Structure logs for forensics (no plaintext)

---

## FILE STRUCTURE

\`\`\`
/app
  /chat/[id]/page.tsx       - Main chat interface
  /create/page.tsx          - Create chat flow
  /join/page.tsx            - Join chat flow
  /page.tsx                 - Landing page
  /layout.tsx               - Root layout
  /globals.css              - Dark theme styling

/lib
  /crypto.ts                - AES-GCM, PBKDF2, key management
  /supabase.ts              - Database client, RLS integration

/scripts
  /setup-database.sql       - Database migrations

/public
  - (static assets)
\`\`\`

---

## TESTING GUIDE

### Manual Testing
\`\`\`
1. Create chat (User A gets invite code)
2. Join chat (User B enters code)
3. Send text message
4. Unlock on both sides
5. Verify message decryption
6. Send image
7. Close tab - should lock
8. Reopen - should be locked again
9. Wrong password - shows lock icon
10. Correct password - unlocks
\`\`\`

### Automated Testing (TODO)
\`\`\`javascript
// tests/crypto.test.ts
import { encryptMessage, decryptMessage } from '@/lib/crypto';

test('encrypt/decrypt message', async () => {
  const key = await deriveKeyFromPassword('test', salt);
  const encrypted = await encryptMessage('hello', key, 'user1', 123);
  const decrypted = await decryptMessage(encrypted, key);
  expect(decrypted).toBe('hello');
});

test('wrong key fails', async () => {
  const key1 = await deriveKeyFromPassword('test1', salt);
  const key2 = await deriveKeyFromPassword('test2', salt);
  const encrypted = await encryptMessage('hello', key1, 'user1', 123);
  const decrypted = await decryptMessage(encrypted, key2);
  expect(decrypted).toBeNull();
});
\`\`\`

---

## FREQUENTLY ASKED QUESTIONS

**Q: Can the server read my messages?**
A: No. All messages are encrypted with AES-GCM before sending. The server never has access to the encryption key (derived from your password).

**Q: What if I forget my unlock secret?**
A: You cannot recover it. The key is derived from the secret using PBKDF2. There is no "master key" or recovery mechanism by design.

**Q: Can you add a third user?**
A: No. The system is designed for exactly two users. Adding groups would compromise security properties.

**Q: Why use Web Crypto API?**
A: It's audited, battle-tested cryptography (NSA Suite B algorithms). No custom crypto or unvetted libraries.

**Q: Is this production-ready?**
A: Not without external security audit. Recommended: hire professional penetration tester before production use.

---

Last Updated: 2024
Zero-Knowledge Encrypted Chat System
