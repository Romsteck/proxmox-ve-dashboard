import { NextRequest, NextResponse } from 'next/server';
import { getSystemLogs } from '@/lib/proxmox/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const node = searchParams.get('node');
    const limitParam = searchParams.get('limit');
    const sinceParam = searchParams.get('since');
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

    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const since = sinceParam ? new Date(sinceParam) : undefined;

    if (limitParam && isNaN(limit)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid limit parameter',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Get system logs from Proxmox
    const logs = await getSystemLogs(node, limit, since, signal);

    return NextResponse.json({
      ok: true,
      logs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch system logs:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch system logs';
    
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