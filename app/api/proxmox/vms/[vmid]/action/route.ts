import { NextRequest, NextResponse } from 'next/server';
import { performVmAction } from '@/lib/proxmox/client';
import type { VmAction } from '@/lib/proxmox/client';

interface ActionRequestBody {
  node: string;
  action: VmAction;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { vmid: string } }
) {
  try {
    const vmid = parseInt(params.vmid, 10);
    
    if (isNaN(vmid)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid VM ID',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const body: ActionRequestBody = await request.json();
    const { node, action } = body;

    if (!node || !action) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: node and action',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate action
    const validActions: VmAction[] = ['start', 'stop', 'restart', 'pause', 'resume', 'shutdown', 'reset'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Perform the VM action
    const result = await performVmAction(node, vmid, action, request.signal);

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: result.message || 'Action failed',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        vmid,
        node,
        action,
        message: result.message,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`Failed to perform VM action:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Action failed';
    
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