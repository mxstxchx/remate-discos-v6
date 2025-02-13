import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    const { searchParams } = new URL(request.url);
    const query = supabase.from('releases');

    const select = searchParams.get('select');
    if (select) {
      query.select(select);
    }

    const orderBy = searchParams.get('order');
    if (orderBy) {
      const [column, direction] = orderBy.split('.');
      query.order(column, { ascending: direction === 'asc' });
    }

    const { data, error } = await query;

    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[API] PostgREST error:', error);
    return NextResponse.json(
      { error: 'Database query failed' },
      { status: 500 }
    );
  }
}