/* eslint-disable @next/next/no-html-link-for-page */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DiagnosticsPage() {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [healthMessage, setHealthMessage] = useState('Checking Supabase connection...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '(not set)');
        setHasKey(!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

        const response = await fetch('/api/health');
        const data = await response.json();

        if (response.ok) {
          setHealthStatus('ok');
          setHealthMessage(`✅ Supabase is reachable: ${data.url}`);
        } else {
          setHealthStatus('error');
          setHealthMessage(`❌ Error: ${data.message}`);
        }
      } catch (err) {
        setHealthStatus('error');
        setHealthMessage(`❌ Connection failed: ${(err as Error).message}`);
      }
    };

    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-mono font-bold mb-2">Diagnostics</h1>
          <p className="text-muted-foreground">Check your Supabase configuration</p>
        </div>

        <div className="space-y-4 border border-border rounded-lg p-6 bg-card">
          <div>
            <h2 className="font-mono font-bold mb-2">Environment Variables</h2>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex items-center justify-between">
                <span>NEXT_PUBLIC_SUPABASE_URL:</span>
                <span className={supabaseUrl === '(not set)' ? 'text-destructive' : 'text-green-500'}>
                  {supabaseUrl === '(not set)' ? '❌ NOT SET' : `✅ ${supabaseUrl.substring(0, 30)}...`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
                <span className={!hasKey ? 'text-destructive' : 'text-green-500'}>
                  {!hasKey ? '❌ NOT SET' : '✅ SET'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="font-mono font-bold mb-2">Supabase Connectivity</h2>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  healthStatus === 'ok'
                    ? 'bg-green-500'
                    : healthStatus === 'error'
                      ? 'bg-destructive'
                      : 'bg-yellow-500 animate-pulse'
                }`}
              />
              <span className="text-sm">{healthMessage}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-mono font-bold">Troubleshooting Steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Make sure Supabase environment variables are set in your Vercel project settings</li>
            <li>Go to Supabase Dashboard → Authentication → Providers</li>
            <li>Enable the "Anonymous" provider if it&apos;s disabled</li>
            <li>Wait 30 seconds for changes to propagate</li>
            <li>Refresh this page to re-check the connection</li>
          </ol>
        </div>

        <div className="flex gap-3">
          <Link
            href="/"
            className="flex items-center justify-center px-4 py-2 rounded-lg border border-border hover:bg-card transition-colors"
          >
            ← Back Home
          </Link>
          <Link
            href="/create"
            className="flex items-center justify-center px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
          >
            Try Creating Chat →
          </Link>
        </div>
      </div>
    </div>
  );
}
