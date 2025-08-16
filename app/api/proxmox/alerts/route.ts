import { NextRequest, NextResponse } from 'next/server';
import { getActiveAlerts } from '@/lib/proxmox/client';

export async function GET(request: NextRequest) {
  try {
    const signal = request.signal;

    // Get active alerts from Proxmox
    const alerts = await getActiveAlerts(signal);

    return NextResponse.json({
      ok: true,
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch alerts';
    
    return NextResponse.json(
      {
        ok: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}