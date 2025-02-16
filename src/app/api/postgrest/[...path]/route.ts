import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { searchParams } = new URL(request.url);
  const path = request.url.split('/api/postgrest/')[1]?.split('?')[0] ?? 'releases';
  
  console.log('[API] Processing request for path:', path);
  
  try {
    let query = supabase.from(path);

    if (searchParams.has('select')) {
      query = query.select(searchParams.get('select')!);
    }

    // Handle filters
    for (const [key, value] of searchParams.entries()) {
      if (!['select', 'order'].includes(key)) {
        const [field, op] = key.split('.');
        if (op === 'gte') query = query.gte(field, value);
        if (op === 'lte') query = query.lte(field, value);
        if (op === 'in') query = query.in(field, value.split(','));
        if (op === 'cs') query = query.contains(field, JSON.parse(value));
      }
    }

    if (searchParams.has('order')) {
      const [column, direction] = searchParams.get('order')!.split('.');
      query = query.order(column, { ascending: direction === 'asc' });
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Query error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}