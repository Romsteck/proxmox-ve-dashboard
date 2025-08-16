import { NextRequest, NextResponse } from 'next/server';
import { acknowledgeAlert } from '@/lib/proxmox/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const alertId = params.alertId;
    
    if (!alertId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Alert ID is required',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Acknowledge the alert
    const result = await acknowledgeAlert(alertId, request.signal);

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to acknowledge alert',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        alertId,
        acknowledged: true,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`Failed to acknowledge alert ${params.alertId}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to acknowledge alert';
    
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