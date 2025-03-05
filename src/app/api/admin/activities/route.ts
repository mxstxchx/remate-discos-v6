import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get user_alias from request header
    const userAlias = request.headers.get('X-User-Alias');
    
    if (!userAlias) {
      return NextResponse.json({
        error: 'No user alias provided'
      }, { status: 401 });
    }

    // Get current session to verify user
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_alias', userAlias)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({
        error: 'No valid session found',
        details: { sessionError }
      }, { status: 401 });
    }

    // Check admin status
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('alias', userAlias)
      .single();

    if (userError || !userData?.is_admin) {
      return NextResponse.json({
        error: 'Not an admin user',
        details: { userError }
      }, { status: 401 });
    }

    // Get audit logs with release details
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        releases (
          id,
          title
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Activities API error:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error
    }, { status: 500 });
  }
}