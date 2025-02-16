import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();
    console.log('[API] Processing SQL:', sql);
    
    if (!sql) {
      return NextResponse.json(
        { error: 'SQL query required' },
        { status: 400 }
      );
    }

    // Extract filter conditions
    const whereMatch = sql.match(/WHERE\s+(.+?)\s+(?:ORDER BY|LIMIT|$)/i);
    const conditions = whereMatch ? whereMatch[1] : '';
    
    // Convert SQL conditions to PostgREST filters
    let filters = '';
    if (conditions) {
      const priceRangeMatch = conditions.match(/price >= (\d+) AND price <= (\d+)/);
      if (priceRangeMatch) {
        filters += `&price=gte.${priceRangeMatch[1]}&price=lte.${priceRangeMatch[2]}`;
      }

      const conditionMatch = conditions.match(/condition IN \('(.+?)'\)/);
      if (conditionMatch) {
        const conditions = conditionMatch[1].split("','");
        filters += `&condition=in.(${conditions.join(',')})`;
      }

      const artistMatch = conditions.match(/artists \?\| array\['(.+?)'\]/);
      if (artistMatch) {
        const artists = artistMatch[1].split("','").map(a => {
          const nameMatch = a.match(/\$.name == "(.+?)"/);
          return nameMatch ? nameMatch[1] : '';
        }).filter(Boolean);
        if (artists.length) {
          filters += `&artists=cs.{name:"${artists.join('","')}"}`;
        }
      }
    }

    // Handle COUNT queries
    if (sql.includes('SELECT COUNT(*)')) {
      console.log('[API] Generating count query path');
      return NextResponse.json({
        method: 'GET',
        path: `/releases?select=count${filters}`
      });
    }

    console.log('[API] Generating data query path with filters:', filters);
    return NextResponse.json({
      method: 'GET',
      path: `/releases?select=id,title,artists,labels,styles,year,country,condition,price,thumb,primary_image,secondary_image${filters}&order=created_at.desc`
    });

  } catch (error) {
    console.error('[API] SQL-to-REST error:', error);
    return NextResponse.json(
      { error: 'Failed to process SQL query' },
      { status: 500 }
    );
  }
}