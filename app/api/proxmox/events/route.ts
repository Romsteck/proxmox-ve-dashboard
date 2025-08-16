import { eventsStream } from "@/lib/proxmox/client";

export const runtime = "nodejs";

export async function GET(_req: Request) {
  const iterator = eventsStream();
  let running = true;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const safeEnqueue = (chunk: string) => {
        if (!running) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Controller might already be closed; stop streaming.
          running = false;
        }
      };

      const send = (event: string, data: unknown) => {
        if (!running) return;
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        safeEnqueue(`event: ${event}\n`);
        safeEnqueue(`data: ${payload}\n\n`);
      };

      // Initial comment to establish stream
      safeEnqueue(`: connected ${new Date().toISOString()}\n\n`);

      (async () => {
        try {
          for await (const msg of iterator) {
            if (!running) break;
            if (msg.type === "heartbeat") {
              // Heartbeats as comments
              safeEnqueue(`: heartbeat ${msg.ts}\n\n`);
            } else if (msg.type === "status") {
              send("status", msg);
            } else if (msg.type === "error") {
              send("error", msg);
            } else {
              send("message", msg);
            }
          }
        } catch (err: any) {
          if (running) {
            send("error", { type: "error", message: err?.message ?? "stream error" });
          }
        }
        // Do not call controller.close() here; cancel() will handle it.
      })();
    },
    cancel() {
      // Client disconnected; stop background loop and close controller on our side
      running = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
    status: 200,
  });
}