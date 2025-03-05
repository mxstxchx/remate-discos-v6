import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { searchParams } = new URL(request.url);
    
    // Create a properly chained query
    const select = searchParams.get('select');
    const orderBy = searchParams.get('order');
    
    let query = supabase.from('releases');
    
    // Apply select
    let builtQuery = select ? query.select(select) : query.select('*');
    
    // Apply order
    if (orderBy) {
      const [column, direction] = orderBy.split('.');
      builtQuery = builtQuery.order(column, { ascending: direction === 'asc' });
    }

    // Direct await on the query instead of calling execute()
    const { data, error } = await builtQuery;

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