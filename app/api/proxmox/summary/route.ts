import { NextResponse } from "next/server";
import { getClusterSummary } from "@/lib/proxmox/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const abort = new AbortController();
    const signal = abort.signal;

    const data = await getClusterSummary(signal);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}