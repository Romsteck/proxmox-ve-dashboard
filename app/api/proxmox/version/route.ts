import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const host = url.searchParams.get('host');
  console.log("[API /api/proxmox/version] Param host reçu :", host);
  if (!host) {
    return NextResponse.json(
      { success: false, error: "Missing required parameter 'host'" },
      { status: 400 }
    );
  }

  const isWindows = process.platform === 'win32';
  const args = isWindows ? ['-n', '1', host] : ['-c', '1', host];

  try {
    const { spawn } = await import('child_process');
    await new Promise<void>((resolve, reject) => {
      const ping = spawn('ping', args);
      ping.stdout.on('data', (data) => {
        console.log("[API /api/proxmox/version] ping stdout:", data.toString());
      });
      ping.stderr.on('data', (data) => {
        console.error("[API /api/proxmox/version] ping stderr:", data.toString());
      });
      ping.on('error', (err) => {
        console.error("[API /api/proxmox/version] ping error:", err);
        reject(err);
      });
      ping.on('exit', (code) => {
        console.log("[API /api/proxmox/version] ping exit code:", code);
        code === 0 ? resolve() : reject(new Error('Ping failed'));
      });
    });
    console.log("[API /api/proxmox/version] SUCCÈS ping, retour JSON { success: true }", { host, timestamp: new Date().toISOString() });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API /api/proxmox/version] catch error:", err, { host, timestamp: new Date().toISOString() });
    return NextResponse.json({ success: false, error: err.message || String(err) });
  }
}