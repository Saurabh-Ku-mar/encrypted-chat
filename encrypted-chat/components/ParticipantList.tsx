cat > components/ParticipantList.tsx << 'EOF'
'use client';

interface ParticipantListProps {
  participants: string[];
  currentUserName: string;
}

export default function ParticipantList({
  participants,
  currentUserName,
}: ParticipantListProps) {
  return (
    <div className="fixed right-4 top-20 w-64 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-700">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Participants ({participants.length})
        </h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {participants.map((participant) => (
          <div
            key={participant}
            className="px-4 py-2 hover:bg-gray-700 transition flex items-center gap-3"
          >
            <div className="relative">
              <div className="w-2 h-2 bg-green-500 rounded-full absolute -top-1 -right-1"></div>
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {participant[0].toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <span className="text-gray-200 text-sm">
                {participant}
                {participant === currentUserName && (
                  <span className="ml-2 text-xs text-blue-400">(you)</span>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
EOF