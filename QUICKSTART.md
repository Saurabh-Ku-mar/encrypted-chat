# QUICK START GUIDE - Encrypted Chat System

Get your encrypted chat running in 10 minutes.

## Step 1: Create Supabase Project (2 min)

1. Go to https://supabase.com/dashboard
2. Click "New project"
3. Fill in details:
   - Name: `encrypted-chat`
   - Database password: Generate strong password
   - Region: Closest to you
4. Wait for database to initialize (~5 min)
5. Copy your credentials from **Settings > API**:
   \`\`\`
   NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...long-key...
   \`\`\`

## Step 2: Enable Anonymous Auth (1 min)

1. In Supabase dashboard, go to **Authentication > Providers**
2. Find "Anonymous" and toggle it ON
3. Click "Save"

## Step 3: Setup Database (2 min)

1. In Supabase, go to **SQL Editor**
2. Click "New Query"
3. Copy-paste all of: `/scripts/setup-database.sql`
4. Click "Run"
5. Wait for success message

## Step 4: Local Setup (2 min)

\`\`\`bash
# Clone repo
git clone https://github.com/yourusername/encrypted-chat.git
cd encrypted-chat

# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...long-key..." >> .env.local

# Start dev server
npm run dev
\`\`\`

Open http://localhost:3000

## Step 5: Test It (3 min)

**Browser 1 (User A - MrBlue):**
1. Click "CREATE CHAT"
2. Enter codename: `MrBlue`
3. Click "CREATE CHAT"
4. Copy the invite code

**Browser 2 or Incognito (User B - MrGreen):**
1. Click "JOIN CHAT"
2. Paste the invite code
3. Enter codename: `MrGreen`
4. Click "JOIN CHAT"

**Both browsers:**
1. Enter unlock secret (e.g., `MySecurePassword123!`)
2. Both click "UNLOCK"
3. Type a message and send
4. Close tab - chat locks automatically
5. Refresh - locked again

## Step 6: Deploy to Vercel (Optional)

\`\`\`bash
# Push to GitHub
git add .
git commit -m "Initial commit: encrypted chat"
git push origin main

# Go to https://vercel.com
# Click "New Project"
# Select your GitHub repo
# Add Environment Variables:
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...long-key...

# Click "Deploy"
\`\`\`

Live at: `https://your-project.vercel.app`

---

## Architecture at a Glance

\`\`\`
┌─────────────┐
│  User A     │  Derives key from password + invite code
│ (MrBlue)    │  
└──────┬──────┘
       │
       │ AES-GCM Encrypt
       │
       ▼
   ┌─────────────────────────────┐
   │  Supabase (Zero-Knowledge)  │
   │  - Encrypted blobs stored    │
   │  - No keys, no plaintext     │
   │  - RLS: only members access  │
   └────────────┬────────────────┘
                │
                │ Encrypted blobs
                │
       ▼
┌──────────┬──────────┐
│  User B  │ Derives same key
│ (MrGreen)│ Decrypts in browser
└──────────┴──────────┘
\`\`\`

## Key Points

| Feature | How It Works |
|---------|------------|
| **Encryption** | AES-GCM 256-bit (Web Crypto API) |
| **Key Derivation** | PBKDF2 (600k iterations) from password + invite code |
| **Server Reads** | Cannot - no keys stored |
| **Privacy** | Codenames only, no email/phone |
| **Session** | Auto-locks when tab hidden |
| **Images** | EXIF stripped, encrypted before upload |
| **Messages** | Immutable (only soft-delete) |

## Troubleshooting

### Supabase Connection Fails
- Check env vars in `.env.local`
- Ensure Supabase project is "Active"
- Check browser DevTools > Network for CORS issues

### Encryption Fails
- Check browser console for errors
- Verify Supabase auth is working
- Try different password (might be wrong key)

### Image Upload Fails
- Must be JPEG or PNG
- Max size 5MB
- Check browser console for errors

### Auto-Lock Not Working
- Check if browser supports `visibilitychange` event
- Try closing/opening tab manually

## Security Tips

1. **Share Invite Code Securely**
   - Use Signal, Wire, or in-person
   - NOT via email, SMS, or Slack
   
2. **Use Strong Unlock Secret**
   - 16+ characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Unique password (not reused elsewhere)

3. **Don't Log Out of Supabase**
   - Encrypted chats use anonymous auth
   - Logging out = losing access to chat

4. **Clear Browser Data Regularly**
   - Removes any cached data
   - Ensures fresh starts

## What to Do Next

1. **Read Architecture**: `/ARCHITECTURE.md`
2. **Review Security**: `/SECURITY_CHECKLIST.md`
3. **Check Database**: `/scripts/setup-database.sql`
4. **Explore Code**:
   - Encryption: `/lib/crypto.ts`
   - Database: `/lib/supabase.ts`
   - UI: `/app/`

## File Structure

\`\`\`
encrypted-chat/
├── /app                    # Next.js pages
│   ├── /chat/[id]         # Main chat interface
│   ├── /create            # Create chat
│   ├── /join              # Join chat
│   ├── page.tsx           # Landing
│   └── layout.tsx
├── /lib
│   ├── crypto.ts          # AES-GCM, PBKDF2
│   └── supabase.ts        # Database client
├── /scripts
│   └── setup-database.sql # Database schema
├── ARCHITECTURE.md        # Detailed design
├── SECURITY_CHECKLIST.md  # Pre-deployment
└── README.md              # Full documentation
\`\`\`

## Example Workflow

\`\`\`
Timeline:

T=0min   User A creates chat (MrBlue)
         Invite code generated & shared

T=1min   User B joins with code (MrGreen)
         Chat becomes "active"

T=2min   Both unlock with same password
         Key derived: PBKDF2(password, salt)
         Messages decrypt in browser

T=5min   Send messages, images
         All encrypted before upload

T=10min  Close tab
         Keys cleared from memory
         Next refresh = locked
\`\`\`

## Security Properties

✓ **Only you can read your messages** (encrypted)
✓ **Server can't read messages** (no keys)
✓ **Each chat has unique key** (independent)
✓ **Messages can't be tampered** (auth tag)
✓ **Session auto-locks** (tab visibility)
✓ **Images have no metadata** (EXIF stripped)
✓ **No personal info needed** (codenames)
✓ **Invite codes expire** (24-hour timeout)

## Limitations

✗ No message reactions
✗ No typing indicators (coming v2)
✗ No video support (coming v2)
✗ No message editing (immutable by design)
✗ No group chats (2-user only)
✗ No disappearing messages (coming v2)
✗ No user discovery (you share code manually)

## Common Questions

**Q: Can I use this for production?**
A: Functionally yes, but get a security audit first.

**Q: What if I forget the password?**
A: No recovery. No master key by design.

**Q: Can my ISP see messages?**
A: HTTPS = encrypted in transit. They see you're using the app, not what you say.

**Q: Is this peer-to-peer?**
A: No, it uses a server (Supabase). All data encrypted at rest.

**Q: Can you read my messages?**
A: No. I don't have encryption keys. Only you and your partner do.

---

**Ready to chat?** Start at http://localhost:3000
