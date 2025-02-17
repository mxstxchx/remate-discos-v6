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

      // Handle array operators for styles (TEXT[])
      const stylesMatch = conditions.match(/styles && ARRAY\[(.*?)\]::text\[\]/);
      if (stylesMatch) {
        const styles = stylesMatch[1].split(',')
          .map(s => s.trim().replace(/'/g, ''));
        // Use array overap with cs operator
        filters += `&styles.cs={${styles.join(',')}}`;
      }

      // Handle array operators for artists (TEXT[])
      const artistsMatch = conditions.match(/artists && ARRAY\[(.*?)\]::text\[\]/);
      if (artistsMatch) {
        const artists = artistsMatch[1].split(',')
          .map(s => s.trim().replace(/'/g, ''));
        // Use array overlap with cs operator
        filters += `&artists.cs={${artists.join(',')}}`;
      }

      // Handle labels JSONB containment
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
        
        if (labelNames.length > 0) {
          // Use JSONB containment with array of objects
          let labelFilter = labelNames.map(name =>
            encodeURIComponent(`{"name":"${name}"}`)
          ).join(',');
          filters += `&labels.cs={${labelFilter}}`;
        }
      }

      // Handle condition IN clause
      const conditionMatch = conditions.match(/condition IN \((.*?)\)/);
      if (conditionMatch) {
        const conditionValues = conditionMatch[1].split(',')
          .map(c => c.trim().replace(/'/g, ''));
        if (conditionValues.length === 1) {
          // Use eq operator for single value
          filters += `&condition.eq=${conditionValues[0]}`;
        } else {
          // Use in operator for multiple values
          filters += `&condition.in=(${conditionValues.join(',')})`;
        }
      }

      // Price range
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