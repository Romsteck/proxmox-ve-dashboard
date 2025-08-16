import { NextResponse } from "next/server";
import { getNodeMetrics } from "@/lib/proxmox/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const node = searchParams.get("node");
    const range = Number(searchParams.get("rangeSeconds") ?? "3600");

    if (!node) {
      return NextResponse.json(
        { ok: false, error: "Missing required query param: node" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(range) || range <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid rangeSeconds" },
        { status: 400 },
      );
    }

    const abort = new AbortController();
    const data = await getNodeMetrics(node, range, abort.signal);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}