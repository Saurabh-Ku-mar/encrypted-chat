cat > app/join/[id]/page.tsx << 'EOF'
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function JoinRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.id as string;

  useEffect(() => {
    router.replace(`/?join=${code}`);
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-white text-lg">Redirecting to chat...</div>
    </div>
  );
}
EOF
