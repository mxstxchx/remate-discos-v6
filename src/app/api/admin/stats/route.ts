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
    console.log('User alias from header:', userAlias);

    if (!userAlias) {
      return NextResponse.json({
        error: 'No user alias provided'
      }, { status: 401 });
    }

    // Get current session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_alias', userAlias)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('Session data:', sessionData);
    console.log('Session error:', sessionError);

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

    console.log('User data:', userData);
    console.log('User error:', userError);

    if (userError || !userData?.is_admin) {
      return NextResponse.json({
        error: 'Not an admin user',
        details: { userError }
      }, { status: 401 });
    }

    const [
      { count: activeReservations },
      { count: queuedItems },
      { count: activeSessions },
      { count: totalRecords },
      { count: soldRecords }
    ] = await Promise.all([
      supabase
        .from('reservations')
        .select('*', { count: 'exact' })
        .eq('status', 'RESERVED'),
      supabase
        .from('reservation_queue')
        .select('*', { count: 'exact' }),
      supabase
        .from('sessions')
        .select('*', { count: 'exact' })
        .gt('expires_at', new Date().toISOString()),
      supabase
        .from('releases')
        .select('*', { count: 'exact' }),
      supabase
        .from('releases')
        .select('*', { count: 'exact' })
        .not('sold_at', 'is', null)
    ]);

    return NextResponse.json({
      activeReservations: activeReservations || 0,
      queuedItems: queuedItems || 0,
      activeSessions: activeSessions || 0,
      totalRecords: totalRecords || 0,
      soldRecords: soldRecords || 0,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error
    }, { status: 500 });
  }
}