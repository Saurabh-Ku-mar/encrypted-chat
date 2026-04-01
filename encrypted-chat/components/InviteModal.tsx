cat > components/InviteModal.tsx << 'EOF'
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
}

export default function InviteModal({ isOpen, onClose, chatId }: InviteModalProps) {
  const [inviteCode, setInviteCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !inviteCode) {
      generateInvite();
    }
  }, [isOpen]);

  const generateInvite = async () => {
    setIsGenerating(true);
    try {
      const code = uuidv4().slice(0, 8);
      await supabase.from('invites').insert({
        chat_id: chatId,
        code,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      setInviteCode(code);
    } catch (error) {
      console.error('Failed to generate invite:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Invite to Chat</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Share this invite code or link
            </label>
            {isGenerating ? (
              <div className="text-center py-4 text-gray-400">Generating...</div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={inviteCode}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-center"
                  />
                  <button
                    onClick={generateInvite}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={copyInviteLink}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                >
                  {copied ? 'Copied!' : 'Copy Invite Link'}
                </button>
              </>
            )}
          </div>

          <div className="text-sm text-gray-400">
            <p>Invite link expires in 7 days. Maximum 10 participants total.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF