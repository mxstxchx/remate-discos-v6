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

    // Get all active reservations with release details
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        release:releases (
          id,
          title,
          artists,
          price,
          condition
        )
      `)
      .eq('status', 'RESERVED')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Get queue sizes for each reservation
    const reservationsWithQueue = await Promise.all(
      (data || []).map(async (reservation) => {
        const { count } = await supabase
          .from('reservation_queue')
          .select('*', { count: 'exact', head: true })
          .eq('release_id', reservation.release_id);

        return {
          ...reservation,
          queue_size: count || 0
        };
      })
    );

    return NextResponse.json(reservationsWithQueue);
  } catch (error) {
    console.error('Reservations API error:', error);
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

    // Get the reservation ID from request body
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({
        error: 'Reservation ID is required'
      }, { status: 400 });
    }

    // First, get the reservation details
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({
        error: 'Reservation not found',
        details: fetchError
      }, { status: 404 });
    }

    // Instead of deleting, set expires_at to yesterday to trigger the existing expiration logic
    // This works with the existing handle_reservation_expiry trigger
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        expires_at: yesterday.toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        user_alias: userAlias,
        release_id: reservation.release_id,
        action: 'EXPIRE_RESERVATION_ADMIN',
        details: {
          reservation_id: id,
          trigger_method: 'expiry_date'
        }
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Expire reservation error:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error
    }, { status: 500 });
  }
}