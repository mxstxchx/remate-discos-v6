import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

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

    // Get all active sessions
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('last_seen_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Sessions API error:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get user_alias from request header
    const userAlias = request.headers.get('X-User-Alias');
    
    if (!userAlias) {
      return NextResponse.json({
        error: 'No user alias provided'
      }, { status: 401 });
    }

    // Verify admin status
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

    // Get the session ID from request body
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({
        error: 'Session ID is required'
      }, { status: 400 });
    }

    // Get current session to verify it's not the same as the one being terminated
    const { data: currentSession, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_alias', userAlias)
      .eq('id', id)
      .maybeSingle();

    if (currentSession) {
      return NextResponse.json({
        error: 'Cannot terminate your current session'
      }, { status: 400 });
    }

    // Terminate the session by updating its expiry date to now
    const { error } = await supabase
      .from('sessions')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        user_alias: userAlias,
        action: 'TERMINATE_SESSION',
        details: { session_id: id }
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Terminate session error:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error
    }, { status: 500 });
  }
}