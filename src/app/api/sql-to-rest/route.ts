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
          .map(s => s.trim().replace(/'/g, ''))
          .join(',');
        // Use cs.{} for array OR logic
        filters += `&styles=cs.{${styles}}`;
      }

      // Handle array operators for artists (TEXT[])
      const artistsMatch = conditions.match(/artists && ARRAY\[(.*?)\]::text\[\]/);
      if (artistsMatch) {
        const artists = artistsMatch[1].split(',')
          .map(s => s.trim().replace(/'/g, ''))
          .join(',');
        // Use cs.{} for array OR logic
        filters += `&artists=cs.{${artists}}`;
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
          // Add all label names in a single or condition
          filters += `&labels.cs={${labelNames.map(name =>
            `"${name}"`
          ).join(',')}}`;
        }
      }

      // Handle condition IN clause
      const conditionMatch = conditions.match(/condition IN \((.*?)\)/);
      if (conditionMatch) {
        const conditionValues = conditionMatch[1].split(',')
          .map(c => c.trim().replace(/'/g, ''));
        if (conditionValues.length === 1) {
          // Use eq for single values
          filters += `&condition=eq.${conditionValues[0]}`;
        } else {
          // Use in.() for multiple values
          filters += `&condition=in.(${conditionValues.join(',')})`;
        }
      }

      // Price range
      const priceMatch = conditions.match(/price >= (\d+) AND price <= (\d+)/);
      if (priceMatch) {
        filters += `&price=gte.${priceMatch[1]}&price=lte.${priceMatch[2]}`;
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