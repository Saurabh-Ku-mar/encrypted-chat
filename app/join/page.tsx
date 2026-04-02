'use client';

import React from "react"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import {
  validateInviteCode,
  joinChat,
  signInAnonymously,
} from '@/lib/supabase';
import { sha256, validateCodename } from '@/lib/crypto';

export default function JoinChat() {
  const router = useRouter();
  const [step, setStep] = useState<'code' | 'codename'>('code');
  const [inviteCode, setInviteCode] = useState('');
  const [codename, setCodename] = useState('');
  const [partnerCodename, setPartnerCodename] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState('');

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[v0] Validating invite code...');

      // Verify code is valid base64-like
      if (!inviteCode.trim()) {
        setError('Please enter an invite code');
        return;
      }

      // Hash the code
      const codeHash = Array.from(await sha256(inviteCode))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Check if code is valid in database
      const chat = await validateInviteCode(codeHash);
      if (!chat) {
        setError('Invalid or expired invite code');
        return;
      }

      console.log('[v0] Code validated, chat found:', chat.id);

      // Store invite code and chat ID
      sessionStorage.setItem(`invite_${chat.id}`, inviteCode);
      setChatId(chat.id);
      setPartnerCodename(chat.codename_a || '');
      setStep('codename');
    } catch (err) {
      console.error('[v0] Error validating code:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[v0] Joining chat with codename:', codename);

      if (!validateCodename(codename)) {
        setError('Invalid codename format');
        return;
      }

      // Sign in anonymously
      const session = await signInAnonymously();
      if (!session) {
        setError('Failed to authenticate');
        return;
      }

      // Join chat
      const updatedChat = await joinChat(
        chatId,
        session.user.id,
        codename
      );

      if (!updatedChat) {
        setError('Failed to join chat');
        return;
      }

      console.log('[v0] Joined chat:', chatId);

      // Redirect to chat
      router.push(`/chat/${chatId}`);
    } catch (err) {
      console.error('[v0] Error joining chat:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
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
          {step === 'code' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-mono font-bold mb-2">
                  JOIN CHAT
                </h1>
                <p className="text-sm text-muted-foreground">
                  STEP 1: Enter Invite Code
                </p>
              </div>

              <form onSubmit={handleValidateCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-semibold text-accent mb-2">
                    INVITE CODE
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value);
                      setError('');
                    }}
                    placeholder="Paste the code here..."
                    className="w-full px-4 py-2 bg-secondary border border-border rounded font-mono text-sm focus:border-accent focus:outline-none"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!inviteCode.trim() || loading}
                  className="w-full px-4 py-2 bg-accent text-primary font-mono font-semibold rounded border border-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'VALIDATING...' : 'VALIDATE CODE'}
                </button>
              </form>

              <div className="border-t border-border pt-4 text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-accent">
                  [INVITE CODE INFO]
                </p>
                <p>
                  Your partner created a chat and shared an invite code with you. Paste it above to join.
                </p>
              </div>
            </div>
          )}

          {step === 'codename' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-mono font-bold mb-2">
                  JOIN CHAT
                </h1>
                <p className="text-sm text-muted-foreground">
                  STEP 2: Choose Your Codename
                </p>
              </div>

              <form onSubmit={handleJoinChat} className="space-y-4">
                <div className="p-3 bg-secondary border border-border rounded">
                  <p className="text-xs text-muted-foreground mb-1">
                    Partner:
                  </p>
                  <p className="font-mono font-semibold text-accent">
                    {partnerCodename}
                  </p>
                </div>

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
                    placeholder="e.g. MrGreen"
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
                  {loading ? 'JOINING...' : 'JOIN CHAT'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('code');
                    setError('');
                  }}
                  className="w-full px-4 py-2 bg-secondary text-foreground font-mono text-sm rounded border border-border hover:bg-muted transition-colors"
                >
                  BACK
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
