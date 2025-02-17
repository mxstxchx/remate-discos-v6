import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();
    console.log('[API] Processing SQL:', sql);
    
    let filters = '';

    // Get WHERE clause if exists
    const whereMatch = sql.match(/WHERE\s+(.+?)\s+(?:ORDER BY|LIMIT|$)/i);
    if (whereMatch) {
      const conditions = whereMatch[1];

      // Handle styles array overlap (TEXT[])
      const stylesMatch = conditions.match(/styles && ARRAY\[(.*?)\]::text\[\]/);
      if (stylesMatch) {
        const styles = stylesMatch[1].split(',')
          .map(s => s.trim().replace(/'/g, ''));
        // Use multiple cs parameters for OR logic
        styles.forEach(style => {
          filters += `&styles.cs=["${style}"]`;
        });
      }

      // Handle styles array (TEXT[])
      const stylesMatch = conditions.match(/styles && ARRAY\[(.*?)\]::text\[\]/);
      if (stylesMatch) {
        const styles = stylesMatch[1].split(',')
          .map(s => s.trim().replace(/'/g, ''));
        // Use multiple parameters for OR logic
        styles.forEach(style => {
          filters += `&styles.cs=["${style}"]`;
        });
      }

      // Handle artists array (TEXT[])
      const artistsMatch = conditions.match(/artists && ARRAY\[(.*?)\]::text\[\]/);
      if (artistsMatch) {
        const artists = artistsMatch[1].split(',')
          .map(s => s.trim().replace(/'/g, ''));
        // Use multiple parameters for OR logic
        artists.forEach(artist => {
          filters += `&artists.cs=["${artist}"]`;
        });
      }

      // Handle labels JSONB
      const labelsMatch = conditions.match(/\((labels @> '\[.*?\]'(\s+OR\s+labels @> '\[.*?\]')*)\)/);
      if (labelsMatch) {
        const labelsConditions = labelsMatch[1].split(' OR ');
        const labelNames = labelsConditions.map(condition => {
          const match = condition.match(/labels @> '\[(.*?)\]'/);
          if (match) {
            const obj = JSON.parse(`[${match[1]}]`)[0];
            return obj.name;
          }
          return null;
        }).filter(Boolean);
        
        labelNames.forEach(name => {
          // Use multiple parameters for OR logic
          filters += `&labels.cs={"name":"${name}"}`;
        });
      }

      // Handle condition IN clause
      const conditionMatch = conditions.match(/condition IN \((.*?)\)/);
      if (conditionMatch) {
        const conditions = conditionMatch[1].split(',')
          .map(c => c.trim().replace(/'/g, ''));
        // Use multiple parameters for OR logic
        conditions.forEach(condition => {
          filters += `&condition=eq.${condition}`;
        });
      }

      // Price range (keep existing working syntax)
      const priceMatch = conditions.match(/price >= (\d+) AND price <= (\d+)/);
      if (priceMatch) {
        filters += `&price.gte=${priceMatch[1]}&price.lte=${priceMatch[2]}`;
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