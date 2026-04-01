cat > components/ChatHeader.tsx << 'EOF'
'use client';

import { useState } from 'react';
import InviteModal from './InviteModal';

interface ChatHeaderProps {
  chatName: string;
  participantCount: number;
  maxParticipants: number;
  userName: string;
  chatId: string;
}

export default function ChatHeader({
  chatName,
  participantCount,
  maxParticipants,
  userName,
  chatId,
}: ChatHeaderProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <>
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-white">{chatName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">
                  {participantCount}/{maxParticipants} participants
                </span>
              </div>
              <span className="text-gray-600">•</span>
              <span className="text-sm text-gray-400">
                Logged in as <span className="text-blue-400">{userName}</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Invite
          </button>
        </div>
      </div>
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        chatId={chatId}
      />
    </>
  );
}
EOF
