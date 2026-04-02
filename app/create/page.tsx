'use client';

import React from "react"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, Lock } from 'lucide-react';
import { createChat, signInAnonymously } from '@/lib/supabase';
import { generateInviteCode, sha256 } from '@/lib/crypto';

export default function CreateChat() {
  const router = useRouter();
  const [step, setStep] = useState<'codename' | 'waiting'>('codename');
  const [codename, setCodename] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [chatId, setChatId] = useState('');
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState('24:00');

  // Update expiration timer
  useEffect(() => {
    if (step !== 'waiting') return;

    const interval = setInterval(() => {
      setExpiresIn((prev) => {
        const [hours, minutes] = prev.split(':').map(Number);
        let totalMinutes = hours * 60 + minutes - 1;

        if (totalMinutes < 0) {
          clearInterval(interval);
          return '00:00';
        }

        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      });
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [step]);

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[v0] Creating chat with codename:', codename);

      // Sign in anonymously if needed
      const session = await signInAnonymously();
      if (!session) {
        setError('Failed to authenticate. Check browser console for details.');
        return;
      }

      // Generate invite code and hash
      const code = generateInviteCode();
      const codeHash = Array.from(await sha256(code))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Create chat
      const chat = await createChat(
        session.user.id,
        codename,
        codeHash
      );

      if (!chat) {
        setError('Failed to create chat');
        return;
      }

      console.log('[v0] Chat created:', chat.id);

      // Store invite code in sessionStorage
      sessionStorage.setItem(`invite_${chat.id}`, code);

      setChatId(chat.id);
      setInviteCode(code);
      setStep('waiting');
    } catch (err) {
      console.error('[v0] Error creating chat:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border py-4 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-md w-full">
          {step === 'codename' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-mono font-bold mb-2">
                  CREATE CHAT
                </h1>
                <p className="text-sm text-muted-foreground">
                  STEP 1: Choose Your Codename
                </p>
              </div>

              <form onSubmit={handleCreateChat} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-semibold text-accent mb-2">
                    YOUR CODENAME
                  </label>
                  <input
                    type="text"
                    value={codename}
                    onChange={(e) => {
                      setCodename(e.target.value);
                      setError('');
                    }}
                    placeholder="e.g. MrBlue"
                    className="w-full px-4 py-2 bg-secondary border border-border rounded font-mono text-sm focus:border-accent focus:outline-none"
                    maxLength={20}
                    disabled={loading}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    3-20 characters, alphanumeric + underscore
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!codename.trim() || loading}
                  className="w-full px-4 py-2 bg-accent text-primary font-mono font-semibold rounded border border-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'CREATING...' : 'CREATE CHAT'}
                </button>
              </form>

              <div className="border-t border-border pt-4 text-xs text-muted-foreground space-y-2">
                <p>
                  Codename must be:
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>3-20 characters long</li>
                  <li>Letters, numbers, underscores only</li>
                  <li>No personal information</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'waiting' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-mono font-bold mb-2">
                  WAITING FOR USER
                </h1>
                <p className="text-sm text-muted-foreground">
                  STEP 2: Share Your Invite Code
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Share this code with your partner (out-of-band, not through this site):
                </p>

                <div className="relative">
                  <input
                    type="text"
                    value={inviteCode}
                    readOnly
                    className="w-full px-4 py-3 bg-secondary border border-border rounded font-mono text-sm"
                  />
                  <button
                    onClick={handleCopyInvite}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-border rounded transition-colors"
                    type="button"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-accent" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="border-l-2 border-accent pl-4 space-y-2">
                <p className="text-xs font-mono font-semibold text-accent">
                  [SECURITY INFO]
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>
                    • Code expires in {expiresIn}
                  </li>
                  <li>
                    • Share via secure channel (not email/SMS)
                  </li>
                  <li>
                    • Both users derive same encryption key from code
                  </li>
                  <li>
                    • Server never sees the code
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  disabled
                  className="w-full px-4 py-2 bg-muted text-muted-foreground font-mono font-semibold rounded border border-border cursor-not-allowed opacity-50"
                >
                  WAITING FOR USER B...
                </button>
                <Link
                  href="/"
                  className="text-center px-4 py-2 bg-secondary text-foreground font-mono text-sm rounded border border-border hover:bg-muted transition-colors"
                >
                  CANCEL
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
