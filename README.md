cat > README.md << 'EOF'
# 🔒 Private Encrypted Chat

End-to-end encrypted chat application for small groups (max 10 participants). No phone number or email required.

## Features

- 🔐 End-to-end encryption (AES-GCM 256-bit)
- 👥 Max 10 participants per chat
- 🔑 Password-protected chats
- 💬 Real-time messaging
- 🚀 No registration required
- 📱 Mobile responsive

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Realtime)
- Web Crypto API

## Quick Start

1. Clone the repository
2. Copy `.env.example` to `.env.local` and add your Supabase credentials
3. Run `npm install`
4. Run `npm run dev`

## Environment Variables

Create `.env.local` with:
