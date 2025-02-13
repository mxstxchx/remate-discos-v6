import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();
    
    if (!sql) {
      return NextResponse.json(
        { error: 'SQL query required' },
        { status: 400 }
      );
    }

    if (sql.includes('SELECT COUNT(*)')) {
      return NextResponse.json({
        method: 'GET',
        path: '/releases?select=count'
      });
    }

    return NextResponse.json({
      method: 'GET',
      path: '/releases?select=id,title,artists,labels,styles,year,country,condition,price,thumb,primary_image,secondary_image&order=created_at.desc'
    });

  } catch (error) {
    console.error('[API] SQL-to-REST error:', error);
    return NextResponse.json(
      { error: 'Failed to process SQL query' },
      { status: 500 }
    );
  }
}