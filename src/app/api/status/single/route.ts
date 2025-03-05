import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const releaseId = searchParams.get('release_id');
  const userAlias = searchParams.get('user_alias');
  
  if (!releaseId) {
    return NextResponse.json(
      { status: null, error: 'Release ID is required' },
      { status: 400 }
    );
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  try {
    console.log(`[API:SINGLE:FIX] Fetching status for release_id=${releaseId}, user=${userAlias || 'none'}`);
    
    // First, explicitly check if the record is sold
    const { data: releaseData, error: releaseError } = await supabase
      .from('releases')
      .select('sold_at, sold_by, visibility')
      .eq('id', parseInt(releaseId))
      .maybeSingle();
      
    if (releaseError) throw releaseError;
    
    // If the record is sold, return that status immediately
    if (releaseData?.sold_at) {
      console.log(`[API:SINGLE:FIX] Record ${releaseId} is SOLD (sold_at: ${releaseData.sold_at})`);
      
      return NextResponse.json({
        status: {
          cartStatus: 'SOLD',
          reservation: null,
          queuePosition: null,
          inCart: false,
          lastValidated: new Date().toISOString(),
          soldAt: releaseData.sold_at,
          soldBy: releaseData.sold_by,
          visibility: releaseData.visibility
        },
        error: null
      });
    }
    
    // If visibility is false, log it for debugging
    if (releaseData && releaseData.visibility === false) {
      console.log(`[API:SINGLE:FIX] Record ${releaseId} has visibility=false`);
    }
    
    // Call the RPC function to get status details
    const { data, error } = await supabase.rpc(
      'get_record_statuses',
      { p_user_alias: userAlias }
    ).eq('release_id', parseInt(releaseId));
    
    if (error) throw error;
    
    // If no data returned from RPC, check if we should return a default status based on release data
    if (!data || data.length === 0) {
      console.log(`[API:SINGLE:FIX] No status data from RPC for ${releaseId}, creating default status`);
      
      return NextResponse.json({
        status: {
          cartStatus: 'AVAILABLE',
          reservation: null,
          queuePosition: null,
          inCart: false,
          lastValidated: new Date().toISOString(),
          visibility: releaseData?.visibility
        },
        error: null
      });
    }
    
    // Build status object with all necessary fields
    const status = {
      cartStatus: data[0].status,
      reservation: data[0].reservation_status ? {
        status: data[0].reservation_status,
        user_alias: data[0].reservation_user
      } : null,
      queuePosition: data[0].queue_position,
      inCart: data[0].in_cart,
      lastValidated: new Date().toISOString(),
      visibility: releaseData?.visibility
    };
    
    console.log(`[API:SINGLE:FIX] Status for release ${releaseId}:`, status);
    
    return NextResponse.json({ status, error: null });
  } catch (error) {
    console.error('[API:SINGLE:FIX] Error fetching status:', error);
    return NextResponse.json(
      { status: null, error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}