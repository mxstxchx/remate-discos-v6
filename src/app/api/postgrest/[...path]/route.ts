  <change>
    <description>Fix multi-value filter handling</description>
    <content>
===
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();
    console.log('[API] Processing SQL:', sql);
    
    let filters = '';
    const whereMatch = sql.match(/WHERE\s+(.+?)\s+(?:ORDER BY|LIMIT|$)/i);
    
    if (whereMatch) {
      const conditions = whereMatch[1];
  console.log('[API] Processing request with params:', Object.fromEntries(searchParams));
  

      // Price range
      if (priceMatch) {

      // Multi-value label filter
      const labelMatch = conditions.match(/labels \?\| array\['([^']+)'\]/);
      if (labelMatch) {
    const filters = searchParams.getAll('or');
    if (filters.length) {
      query = query.or(filters.join(','));
    }

    // Handle simple filters
    searchParams.forEach((value, key) => {
      if (!['select', 'or', 'order'].includes(key)) {
        const [field, op] = key.split('.');
        if (op === 'eq') query = query.eq(field, value);
        if (op === 'gte') query = query.gte(field, value);
        if (op === 'lte') query = query.lte(field, value);
        if (op === 'cs') query = query.contains(field, JSON.parse(value));
    console.log('[API] Generated filters:', filters);
    });

    if (searchParams.has('order')) {
      const [column, direction] = searchParams.get('order')!.split('.');
      query = query.order(column, { ascending: direction === 'asc' });

    return NextResponse.json({
    console.log('[API] Executing query:', query);
      method: 'GET',
      path: `/releases?select=id,title,artists,labels,styles,year,country,condition,price,thumb,primary_image,secondary_image${filters}&order=created_at.desc`
    });

  } catch (error) {
    console.error('[API] SQL-to-REST error:', error);
    return NextResponse.json({ error: 'Failed to process SQL query' }, { status: 500 });
  }
}