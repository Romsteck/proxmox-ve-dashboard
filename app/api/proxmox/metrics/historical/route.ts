import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalMetrics } from '@/lib/proxmox/client';
import type { TimeRange } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const node = searchParams.get('node');
    const timeRange = searchParams.get('timeRange') as TimeRange;
    const vmidParam = searchParams.get('vmid');
    const signal = request.signal;

    if (!node || !timeRange) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required parameters: node and timeRange',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate time range
    const validTimeRanges: TimeRange[] = ['1h', '6h', '24h', '7d', '30d'];
    if (!validTimeRanges.includes(timeRange)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const vmid = vmidParam ? parseInt(vmidParam, 10) : undefined;
    if (vmidParam && isNaN(vmid!)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid VM ID',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Get historical metrics from Proxmox
    const metrics = await getHistoricalMetrics(node, timeRange, vmid, signal);

    return NextResponse.json({
      ok: true,
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch historical metrics:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch historical metrics';
    
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