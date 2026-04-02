/**
 * Health check endpoint for Supabase connectivity
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('[v0] Health check - Supabase URL:', supabaseUrl);
    console.log('[v0] Health check - Key exists:', !!supabaseKey);

    if (!supabaseUrl || !supabaseKey) {
      return Response.json(
        { status: 'error', message: 'Missing environment variables' },
        { status: 500 }
      );
    }

    // Try to fetch Supabase health
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });

    console.log('[v0] Health check response:', response.status);

    if (!response.ok) {
      return Response.json(
        { 
          status: 'error', 
          message: `Supabase health check failed: ${response.status}`,
          url: supabaseUrl,
        },
        { status: 500 }
      );
    }

    return Response.json({
      status: 'ok',
      message: 'Supabase is reachable',
      url: supabaseUrl,
    });
  } catch (err) {
    console.error('[v0] Health check error:', err);
    return Response.json(
      { 
        status: 'error', 
        message: (err as Error).message,
      },
      { status: 500 }
    );
  }
}
