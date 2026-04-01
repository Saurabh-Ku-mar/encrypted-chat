cat > lib/types.ts << 'EOF'
export interface Chat {
  id: string;
  name: string;
  created_at: string;
  max_users: number;
  current_users: number;
}

export interface Message {
  id: string;
  chat_id: string;
  encrypted_content: string;
  sender_name: string;
  created_at: string;
  decrypted?: string;
}

export interface Participant {
  chat_id: string;
  user_name: string;
  joined_at: string;
}

export interface Invite {
  id: string;
  chat_id: string;
  code: string;
  created_at: string;
  expires_at: string;
}
EOF