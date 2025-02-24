import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

    // Get the release ID from request body
    const { releaseId, notes } = await request.json();
    
    if (!releaseId) {
      return NextResponse.json({
        error: 'Release ID is required'
      }, { status: 400 });
    }

    // Call database function to mark record as sold
    const { error: fnError } = await supabase
      .rpc('mark_record_as_sold', {
        p_release_id: releaseId,
        p_notes: notes || null
      });

    if (fnError) {
      throw fnError;
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        user_alias: userAlias,
        release_id: releaseId,
        action: 'MARK_SOLD',
        details: { notes }
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark as sold error:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error
    }, { status: 500 });
  }
}