'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Lock, Shield } from 'lucide-react';

export default function Landing() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-accent" />
            <h1 className="text-xl font-mono font-bold">SECURE_CHAT</h1>
          </div>
          <div className="text-xs text-muted-foreground">
            Zero-Knowledge E2EE System
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl w-full space-y-12">
          {/* Hero Section */}
          <div className="space-y-6 text-center">
            <div className="space-y-3">
              <h2 className="text-5xl font-mono font-bold tracking-tight text-balance">
                Mr. ↔ Mrs 
              </h2>
              <p className="text-lg text-muted-foreground">
                Private. Encrypted. Anonymous.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-accent" />
                <span>
                  End-to-End Encrypted (AES-GCM)
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <Lock className="w-4 h-4 text-accent" />
                <span>
                  Server Cannot Read Messages
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-accent" />
                <span>
                  Codename-Based Identity
                </span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link
              href="/create"
              className="px-8 py-3 bg-accent text-primary font-mono font-semibold rounded border border-accent hover:bg-accent/90 transition-colors text-center"
            >
              CREATE CHAT
            </Link>
            <Link
              href="/join"
              className="px-8 py-3 bg-secondary text-foreground font-mono font-semibold rounded border border-border hover:bg-muted transition-colors text-center"
            >
              JOIN CHAT
            </Link>
          </div>

          {/* Info Box */}
          <div className="border border-border rounded bg-card p-6 space-y-3">
            <h3 className="font-mono font-semibold text-accent">
              [SYSTEM INFORMATION]
            </h3>
            <ul className="text-sm space-y-2 text-muted-foreground font-mono">
              <li>
                • Each chat supports exactly TWO users (no groups)
              </li>
              <li>
                • Messages are locked by default and require an unlock secret
              </li>
              <li>
                • All data on server is encrypted
              </li>
              <li>
                • Invite codes expire 24 hours after creation
              </li>
              <li>
                • Session keys are cleared when tab is hidden or closed
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6 mt-auto">
        <div className="max-w-7xl mx-auto text-center text-xs text-muted-foreground font-mono">
          <p>
            ENCRYPTED_CHAT_SYSTEM © 2026 | Zero-Knowledge Architecture By Saurabh Kumar
          </p>
        </div>
      </footer>
    </div>
  );
}
