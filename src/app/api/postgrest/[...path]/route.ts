import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { searchParams } = new URL(request.url);
  
  try {
    let query = supabase.from(String(params.path[0]));

    if (searchParams.has('select')) {
      query = query.select(searchParams.get('select')!);
    }

    if (searchParams.has('order')) {
      const [column, direction] = searchParams.get('order')!.split('.');
      query = query.order(column, { ascending: direction === 'asc' });
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}