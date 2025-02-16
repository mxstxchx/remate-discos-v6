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

    let filters = '';
    const whereMatch = sql.match(/WHERE\s+(.+?)\s+(?:ORDER BY|LIMIT|$)/i);
    
    if (whereMatch) {
      const conditions = whereMatch[1];
      console.log('[API] Parsing conditions:', conditions);

      // Price range
      const priceMatch = conditions.match(/price >= (\d+) AND price <= (\d+)/);
      if (priceMatch) {
        filters += `&price.gte=${priceMatch[1]}&price.lte=${priceMatch[2]}`;
      }

      // Condition
      const condMatch = conditions.match(/condition IN \('([^']+)'\)/);
      if (condMatch) {
        filters += `&condition.in=${condMatch[1]}`;
      }

      // Labels
      const labelMatch = conditions.match(/labels \?\| array\['([^']+)'\]/);
      if (labelMatch) {
        const labels = labelMatch[1].match(/\$.name == "([^"]+)"/g)
          ?.map(x => x.match(/"([^"]+)"/)?.[1])
          .filter(Boolean);
        if (labels?.length) {
          filters += `&labels.cs={"name":"${labels.join('","')}"}`;
        }
      }

      // Styles
      const styleMatch = conditions.match(/styles \?\| array\['([^']+)'\]/);
      if (styleMatch) {
        filters += `&styles.cs=["${styleMatch[1]}"]`;
      }
    }

    console.log('[API] Generated filters:', filters);

    if (sql.includes('SELECT COUNT(*)')) {
      return NextResponse.json({
        method: 'GET',
        path: `/releases?select=count${filters}`
      });
    }

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