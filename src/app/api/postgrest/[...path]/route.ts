import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { validateQuery } from '@/lib/validation';
import type { PostgRESTQuery } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { searchParams } = new URL(request.url);
  const path = request.url.split('/api/postgrest/')[1]?.split('?')[0] ?? 'releases';
  
  console.log('[API] Processing request for path:', path);
  
  try {
    // Parse and validate query parameters
    const query: PostgRESTQuery = {
      select: searchParams.get('select') || undefined,
      page: searchParams.has('page') ? Number(searchParams.get('page')) : undefined,
      perPage: searchParams.has('perPage') ? Number(searchParams.get('perPage')) : undefined,
      order: searchParams.get('order') || undefined      
    };

    // Parse filter parameters
    const filterParams = Object.fromEntries(
      Array.from(searchParams.entries())
        .filter(([key]) => !['select', 'page', 'perPage', 'order'].includes(key))
    );

    if (Object.keys(filterParams).length > 0) {
      query.filter = filterParams;
    }

    // Validate query
    const validatedQuery = validateQuery(query);
    
    // Build query
    let dbQuery = supabase.from(path);

    // Apply select
    if (validatedQuery.select) {
      dbQuery = dbQuery.select(validatedQuery.select, { count: 'exact' });
    }

    // Apply filters
    if (validatedQuery.filter) {
      Object.entries(validatedQuery.filter).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          const { operator, value: filterValue } = value;
          
          if (operator === 'cs') {
            dbQuery = dbQuery.contains(key, filterValue);
          } else if (operator === 'in') {
            dbQuery = dbQuery.in(key, filterValue);
          } else if (operator === 'and') {
            filterValue.forEach((condition: any) => {
              dbQuery = dbQuery[condition.operator](key, condition.value);
            });
          } else {
            dbQuery = dbQuery[operator](key, filterValue);
          }
        } else {
          dbQuery = dbQuery.eq(key, value);
        }
      });
    }

    // Apply pagination
    if (validatedQuery.page && validatedQuery.perPage) {
      const from = (validatedQuery.page - 1) * validatedQuery.perPage;
      const to = from + validatedQuery.perPage - 1;
      dbQuery = dbQuery.range(from, to);
    }

    // Apply ordering
    if (validatedQuery.order) {
      const [column, direction] = validatedQuery.order.split('.');
      dbQuery = dbQuery.order(column, { ascending: direction === 'asc' });
    }

    const { data, error, count } = await dbQuery;
    
    if (error) throw error;

    return NextResponse.json({
      data,
      count,
      error: null
    });
  } catch (error) {
    console.error('[API] Query error:', error);
    return NextResponse.json({
      data: null,
      count: null,
      error: error instanceof Error ? error.message : 'Query failed'
    }, {
      status: 500
    });
  }
}