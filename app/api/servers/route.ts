import { NextRequest, NextResponse } from 'next/server';
import { getServers, addServer } from 'lib/services/mongoServerService';

// GET /api/servers - List all servers
export async function GET(req: NextRequest) {
  try {
    const servers = await getServers();
    return NextResponse.json({ servers }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch servers', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/servers - Add a new server
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const newServer = await addServer(data);
    return NextResponse.json({ server: newServer }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add server', details: (error as Error).message },
      { status: 500 }
    );
  }
}