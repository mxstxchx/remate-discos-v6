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
  const tableName = params.path?.[0] ?? 'releases';
  
  try {
    let query = supabase.from(tableName);
    const filters: any = {};

    searchParams.forEach((value, key) => {
      const [field, op] = key.split('.');
      if (op) {
        filters[field] = { [op]: value };
      }
    });

    console.log('[API] Applying filters:', filters);
    
    if (searchParams.has('select')) {
      query = query.select(searchParams.get('select')!);
    }

    for (const [field, conditions] of Object.entries(filters)) {
      for (const [op, value] of Object.entries(conditions)) {
        switch (op) {
          case 'gte':
            query = query.gte(field, value);
            break;
          case 'lte':
            query = query.lte(field, value);
            break;
          case 'in':
            query = query.in(field, value.split(','));
            break;
          case 'cs':
            query = query.contains(field, JSON.parse(value));
            break;
        }
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Query error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}