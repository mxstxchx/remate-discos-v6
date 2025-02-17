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

      // Handle multiple OR conditions for Artists
      const artistsOrMatch = conditions.match(/\((artists @> '\[.*?\]'(\s+OR\s+artists @> '\[.*?\]')*)\)/);
      if (artistsOrMatch) {
        const artistsConditions = artistsOrMatch[1].split(' OR ');
        artistsConditions.forEach(condition => {
          const match = condition.match(/artists @> '\[(.*?)\]'/);
          if (match) {
            const obj = JSON.parse(`[${match[1]}]`)[0];
            filters += `&artists.cs={"name":"${obj.name}"}`;
          }
        });
      }

      // Handle multiple OR conditions for Labels using containment
      const labelsOrMatch = conditions.match(/\((labels @> '\[.*?\]'(\s+OR\s+labels @> '\[.*?\]')*)\)/);
      if (labelsOrMatch) {
        const labelsConditions = labelsOrMatch[1].split(' OR ');
        const labelNames = labelsConditions.map(condition => {
          const match = condition.match(/labels @> '\[(.*?)\]'/);
          if (match) {
            const obj = JSON.parse(`[${match[1]}]`)[0];
            return obj.name;
          }
          return null;
        }).filter(Boolean);
        
        if (labelNames.length > 0) {
          filters += `&labels=cs.${JSON.stringify(labelNames.map(name => ({ name })))}`;
        }
      }

      // Handle styles with array overlap - single overlap operator
      const styleMatch = conditions.match(/styles && ARRAY\[(.*?)\]::text\[\]/);
      if (styleMatch) {
        const styles = styleMatch[1].split(',')
          .map(s => s.trim().replace(/'/g, ''))
          .join(',');
        filters += `&styles=ov.{${styles}}`;
      }

      // Handle condition IN clause - single in operator
      const conditionMatch = conditions.match(/condition IN \((.*?)\)/);
      if (conditionMatch) {
        const conditions = conditionMatch[1].split(',')
          .map(c => c.trim().replace(/'/g, ''))
          .join(',');
        filters += `&condition=in.(${conditions})`;
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