import { NextRequest, NextResponse } from 'next/server';
import { getBackupJobs } from '@/lib/proxmox/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const node = searchParams.get('node');
    const signal = request.signal;

    // Get backup jobs from Proxmox
    const backups = await getBackupJobs(node || undefined, signal);

    return NextResponse.json({
      ok: true,
      backups,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch backup jobs:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch backup jobs';
    
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