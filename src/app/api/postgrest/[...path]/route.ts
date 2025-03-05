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
    
    // Apply different query strategies based on presence of select
    if (validatedQuery.select) {
      // When select is specified, build query with full chaining
      let selectQuery = supabase.from(path).select(validatedQuery.select, { count: 'exact' });
      
      // Apply filters
      if (validatedQuery.filter) {
        Object.entries(validatedQuery.filter).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            const { operator, value: filterValue } = value;
            
            if (operator === 'cs') {
              selectQuery = selectQuery.contains(key, filterValue);
            } else if (operator === 'in') {
              selectQuery = selectQuery.in(key, filterValue);
            } else if (operator === 'and') {
              filterValue.forEach((condition: any) => {
                // Use explicit conditionals instead of dynamic access for type safety
                if (condition.operator === 'eq') {
                  selectQuery = selectQuery.eq(key, condition.value);
                } else if (condition.operator === 'neq') {
                  selectQuery = selectQuery.neq(key, condition.value);
                } else if (condition.operator === 'gt') {
                  selectQuery = selectQuery.gt(key, condition.value);
                } else if (condition.operator === 'gte') {
                  selectQuery = selectQuery.gte(key, condition.value);
                } else if (condition.operator === 'lt') {
                  selectQuery = selectQuery.lt(key, condition.value);
                } else if (condition.operator === 'lte') {
                  selectQuery = selectQuery.lte(key, condition.value);
                } else if (condition.operator === 'like') {
                  selectQuery = selectQuery.like(key, condition.value);
                } else if (condition.operator === 'ilike') {
                  selectQuery = selectQuery.ilike(key, condition.value);
                } else if (condition.operator === 'is') {
                  selectQuery = selectQuery.is(key, condition.value);
                } else if (condition.operator === 'in') {
                  selectQuery = selectQuery.in(key, condition.value);
                } else if (condition.operator === 'contains') {
                  selectQuery = selectQuery.contains(key, condition.value);
                } else {
                  console.warn(`Unsupported operator: ${condition.operator}`);
                }
              });
            } else {
              // Use explicit conditionals for operator
              if (operator === 'eq') {
                selectQuery = selectQuery.eq(key, filterValue);
              } else if (operator === 'neq') {
                selectQuery = selectQuery.neq(key, filterValue);
              } else if (operator === 'gt') {
                selectQuery = selectQuery.gt(key, filterValue);
              } else if (operator === 'gte') {
                selectQuery = selectQuery.gte(key, filterValue);
              } else if (operator === 'lt') {
                selectQuery = selectQuery.lt(key, filterValue);
              } else if (operator === 'lte') {
                selectQuery = selectQuery.lte(key, filterValue);
              } else if (operator === 'like') {
                selectQuery = selectQuery.like(key, filterValue);
              } else if (operator === 'ilike') {
                selectQuery = selectQuery.ilike(key, filterValue);
              } else if (operator === 'is') {
                selectQuery = selectQuery.is(key, filterValue);
              } else {
                console.warn(`Unsupported operator: ${operator}`);
              }
            }
          } else {
            selectQuery = selectQuery.eq(key, value);
          }
        });
      }
      
      // Apply pagination
      if (validatedQuery.page && validatedQuery.perPage) {
        const from = (validatedQuery.page - 1) * validatedQuery.perPage;
        const to = from + validatedQuery.perPage - 1;
        selectQuery = selectQuery.range(from, to);
      }
      
      // Apply ordering
      if (validatedQuery.order) {
        const [column, direction] = validatedQuery.order.split('.');
        selectQuery = selectQuery.order(column, { ascending: direction === 'asc' });
      }
      
      const { data, error, count } = await selectQuery;
      
      if (error) throw error;

      return NextResponse.json({
        data,
        count,
        error: null
      });
    } else {
      // When no select is specified, do a simpler query
      let simpleQuery = supabase.from(path).select('*');
      
      // Apply filters
      if (validatedQuery.filter) {
        Object.entries(validatedQuery.filter).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            const { operator, value: filterValue } = value;
            
            if (operator === 'cs') {
              simpleQuery = simpleQuery.contains(key, filterValue);
            } else if (operator === 'in') {
              simpleQuery = simpleQuery.in(key, filterValue);
            } else if (operator === 'and') {
              filterValue.forEach((condition: any) => {
                // Use explicit conditionals instead of dynamic access for type safety
                if (condition.operator === 'eq') {
                  simpleQuery = simpleQuery.eq(key, condition.value);
                } else if (condition.operator === 'neq') {
                  simpleQuery = simpleQuery.neq(key, condition.value);
                } else if (condition.operator === 'gt') {
                  simpleQuery = simpleQuery.gt(key, condition.value);
                } else if (condition.operator === 'gte') {
                  simpleQuery = simpleQuery.gte(key, condition.value);
                } else if (condition.operator === 'lt') {
                  simpleQuery = simpleQuery.lt(key, condition.value);
                } else if (condition.operator === 'lte') {
                  simpleQuery = simpleQuery.lte(key, condition.value);
                } else if (condition.operator === 'like') {
                  simpleQuery = simpleQuery.like(key, condition.value);
                } else if (condition.operator === 'ilike') {
                  simpleQuery = simpleQuery.ilike(key, condition.value);
                } else if (condition.operator === 'is') {
                  simpleQuery = simpleQuery.is(key, condition.value);
                } else if (condition.operator === 'in') {
                  simpleQuery = simpleQuery.in(key, condition.value);
                } else if (condition.operator === 'contains') {
                  simpleQuery = simpleQuery.contains(key, condition.value);
                } else {
                  console.warn(`Unsupported operator: ${condition.operator}`);
                }
              });
            } else {
              // Use explicit conditionals for operator
              if (operator === 'eq') {
                simpleQuery = simpleQuery.eq(key, filterValue);
              } else if (operator === 'neq') {
                simpleQuery = simpleQuery.neq(key, filterValue);
              } else if (operator === 'gt') {
                simpleQuery = simpleQuery.gt(key, filterValue);
              } else if (operator === 'gte') {
                simpleQuery = simpleQuery.gte(key, filterValue);
              } else if (operator === 'lt') {
                simpleQuery = simpleQuery.lt(key, filterValue);
              } else if (operator === 'lte') {
                simpleQuery = simpleQuery.lte(key, filterValue);
              } else if (operator === 'like') {
                simpleQuery = simpleQuery.like(key, filterValue);
              } else if (operator === 'ilike') {
                simpleQuery = simpleQuery.ilike(key, filterValue);
              } else if (operator === 'is') {
                simpleQuery = simpleQuery.is(key, filterValue);
              } else {
                console.warn(`Unsupported operator: ${operator}`);
              }
            }
          } else {
            simpleQuery = simpleQuery.eq(key, value);
          }
        });
      }
      
      // Apply pagination
      if (validatedQuery.page && validatedQuery.perPage) {
        const from = (validatedQuery.page - 1) * validatedQuery.perPage;
        const to = from + validatedQuery.perPage - 1;
        simpleQuery = simpleQuery.range(from, to);
      }
      
      // Apply ordering
      if (validatedQuery.order) {
        const [column, direction] = validatedQuery.order.split('.');
        simpleQuery = simpleQuery.order(column, { ascending: direction === 'asc' });
      }
      
      const { data, error } = await simpleQuery;
      
      if (error) throw error;

      return NextResponse.json({
        data,
        count: data?.length || 0,
        error: null
      });
    }
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