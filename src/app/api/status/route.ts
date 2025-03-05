import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userAlias = searchParams.get('user_alias');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  try {
    console.log('[API:STATUS] Fetching statuses for', userAlias || 'all users');
    
    // First get sold records directly
    const { data: soldRecords, error: soldError } = await supabase
      .from('releases')
      .select('id, sold_at, sold_by')
      .not('sold_at', 'is', null);
      
    if (soldError) throw soldError;
    
    console.log(`[API:STATUS] Found ${soldRecords?.length || 0} sold records`);
    
    // Create map of sold records for faster lookups
    const soldMap = {};
    soldRecords?.forEach(record => {
      soldMap[record.id] = {
        cartStatus: 'SOLD',
        reservation: null,
        soldAt: record.sold_at,
        soldBy: record.sold_by,
        lastValidated: new Date().toISOString()
      };
    });
    
    // Get other statuses via RPC function
    const { data, error } = await supabase.rpc(
      'get_record_statuses',
      { p_user_alias: userAlias }
    );
    
    if (error) throw error;
    
    console.log(`[API:STATUS] Retrieved ${data?.length || 0} status entries`);
    
    // Merge statuses, prioritizing sold records
    const statusMap = { ...soldMap, ...data.reduce((acc, item) => {
      // Don't override sold status
      if (!soldMap[item.release_id]) {
        acc[item.release_id] = {
          cartStatus: item.status,
          reservation: item.reservation_status ? {
            status: item.reservation_status,
            user_alias: item.reservation_user
          } : null,
          queuePosition: item.queue_position,
          inCart: item.in_cart,
          lastValidated: new Date().toISOString()
        };
      }
      return acc;
    }, {})};
    
    return NextResponse.json({ 
      statusMap, 
      error: null,
      count: Object.keys(statusMap).length
    });
  } catch (error) {
    console.error('[API:STATUS] Error fetching statuses:', error);
    return NextResponse.json(
      { statusMap: null, error: 'Failed to fetch statuses' },
      { status: 500 }
    );
  }
}