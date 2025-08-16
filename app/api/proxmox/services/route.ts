import { NextRequest, NextResponse } from 'next/server';
import { getServiceStatus } from '@/lib/proxmox/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const node = searchParams.get('node');
    const signal = request.signal;

    if (!node) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Node parameter is required',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Get service status from Proxmox
    const services = await getServiceStatus(node, signal);

    return NextResponse.json({
      ok: true,
      services,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch service status:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch service status';
    
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