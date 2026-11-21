import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';

  if (code) {
    try {
      const supabase = await getSupabaseServerClient();
      if (supabase) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          const forwardedHost = request.headers.get('x-forwarded-host');
          const isLocal = process.env.NODE_ENV === 'development';
          if (isLocal) {
            return NextResponse.redirect(`${origin}${next}`);
          } else if (forwardedHost) {
            return NextResponse.redirect(`https://${forwardedHost}${next}`);
          } else {
            return NextResponse.redirect(`${origin}${next}`);
          }
        }
        console.warn('OAuth code exchange error:', error);
      }
    } catch (err) {
      console.warn('Supabase callback error:', err);
    }
  }

  // Fallback if exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
