import { NextRequest, NextResponse } from 'next/server';
import { getVmList } from '@/lib/proxmox/client';
import { validateVmList } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const signal = request.signal;

    // Get VM list from Proxmox
    const vmList = await getVmList(signal);

    // Validate the response
    const validatedData = validateVmList(vmList);

    return NextResponse.json(validatedData);
  } catch (error) {
    console.error('Failed to fetch VMs:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch VMs';
    
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