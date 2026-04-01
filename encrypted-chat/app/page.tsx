cat > app/page.tsx << 'EOF'
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { MAX_PARTICIPANTS, ERROR_MESSAGES } from '@/lib/constants';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [chatName, setChatName] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setMode('join');
      setInviteCode(joinCode);
    }
  }, [searchParams]);

  const createChat = async () => {
    if (!chatName.trim()) {
      setError('Please enter a chat name');
      return;
    }
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const chat = await db.createChat(chatName);
      const code = uuidv4().slice(0, 8);
      await db.createInvite(chat.id, code);
      
      sessionStorage.setItem(`chat_password_${chat.id}`, password);
      
      router.push(`/chat/${chat.id}`);
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('Failed to create chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const joinChat = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }
    if (!password.trim()) {
      setError('Please enter the chat password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const invite = await db.validateInvite(inviteCode);
      if (!invite) {
        setError(ERROR_MESSAGES.INVALID_INVITE);
        setLoading(false);
        return;
      }

      const participantCount = await db.getParticipantCount(invite.chat_id);
      if (participantCount >= MAX_PARTICIPANTS) {
        setError(ERROR_MESSAGES.CHAT_FULL);
        setLoading(false);
        return;
      }

      sessionStorage.setItem(`chat_password_${invite.chat_id}`, password);
      
      router.push(`/chat/${invite.chat_id}`);
    } catch (err) {
      console.error('Error joining chat:', err);
      setError(ERROR_MESSAGES.INVALID_INVITE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Private Chat</h1>
          <p className="text-gray-400">End-to-end encrypted messaging</p>
        </div>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setMode('create');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-lg font-medium transition ${
              mode === 'create'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Create Chat
          </button>
          <button
            onClick={() => {
              setMode('join');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-lg font-medium transition ${
              mode === 'join'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Join Chat
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {mode === 'create' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Chat Name
              </label>
              <input
                type="text"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                placeholder="My Private Room"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Encryption Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                placeholder="••••••••"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                This password encrypts all messages. Share it securely with participants.
              </p>
            </div>
            <button
              onClick={createChat}
              disabled={loading || !chatName || !password}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition mt-2"
            >
              {loading ? 'Creating...' : 'Create Chat'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500 transition"
                placeholder="8-character code"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Chat Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            <button
              onClick={joinChat}
              disabled={loading || !inviteCode || !password}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition mt-2"
            >
              {loading ? 'Joining...' : 'Join Chat'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
EOF