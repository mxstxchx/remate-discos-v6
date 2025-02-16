import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();
    console.log('[API] Processing SQL:', sql);
    
    let filters = '';
    const whereMatch = sql.match(/WHERE\s+(.+?)\s+(?:ORDER BY|LIMIT|$)/i);
    
    if (whereMatch) {
      const conditions = whereMatch[1];

      // Price range
      const priceMatch = conditions.match(/price >= (\d+) AND price <= (\d+)/);
      if (priceMatch) {
        filters += `&price.gte=${priceMatch[1]}&price.lte=${priceMatch[2]}`;
      }

      // Condition filter
      const condMatch = conditions.match(/condition IN \('([^']+)'\)/);
      if (condMatch) {
        filters += `&condition.in=${condMatch[1]}`;
      }

      // Artists filter - handle JSONB array containment
      const artistsMatch = conditions.match(/artists @> '\[(.*?)\]'/);
      if (artistsMatch) {
        const artistObjs = JSON.parse(`[${artistsMatch[1]}]`);
        const artistFilters = artistObjs.map((obj: any) =>
          `&artists.cs={"name":"${obj.name}"}`
        ).join('');
        filters += artistFilters;
      }

      // Labels filter - handle JSONB array containment
      const labelsMatch = conditions.match(/labels @> '\[(.*?)\]'/);
      if (labelsMatch) {
        const labelObjs = JSON.parse(`[${labelsMatch[1]}]`);
        const labelFilters = labelObjs.map((obj: any) =>
          `&labels.cs={"name":"${obj.name}"}`
        ).join('');
        filters += labelFilters;
      }

      // Style filter - handle array overlap
      const styleMatch = conditions.match(/styles && ARRAY\[(.*?)\]/);
      if (styleMatch) {
        const styles = styleMatch[1].split(',').map(s => s.trim().replace(/'/g, ''));
        const styleFilters = styles.map(style =>
          `&styles.cs=["${style}"]`
        ).join('');
        filters += styleFilters;
      }
    }

    console.log('[API] Generated filters:', filters);

    return NextResponse.json({
      method: 'GET',
      path: `/releases?select=id,title,artists,labels,styles,year,country,condition,price,thumb,primary_image,secondary_image${filters}&order=created_at.desc`
    });
  } catch (error) {
    console.error('[API] SQL-to-REST error:', error);
    return NextResponse.json({ error: 'Failed to process SQL query' }, { status: 500 });
  }
}