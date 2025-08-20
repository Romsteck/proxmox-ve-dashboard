import type { IncomingHttpHeaders } from "http";
import { env } from "../../../env";
import type {
  ClusterSummary,
  EventMessage,
  MetricsSeries,
  NodeSummary,
  ProxmoxClient,
} from "../client";

/**
 * HTTPS adapter for Proxmox API.
 * Uses token-based auth:
 * - Header: Authorization: PVEAPIToken=<tokenid>=<tokensecret>
 *
 * Notes:
 * - For self-signed certs in development, set PROXMOX_INSECURE_TLS=true.
 * - Proxmox API base paths generally start with /api2/json.
 */

type HttpsClientOptions = {
  baseUrl: string;
  tokenId?: string;
  tokenSecret?: string;
  insecureTLS?: boolean;
  cacheTtlMs?: number;
  pollIntervalMs?: number;
};

function authHeader(tokenId?: string, tokenSecret?: string): string | undefined {
  if (!tokenId || !tokenSecret) return undefined;
  return `PVEAPIToken=${tokenId}=${tokenSecret}`;
}

// Simple in-memory cache for small responses
const memoryCache = new Map<string, { data: unknown; exp: number }>();

async function httpGetJSON<T>(url: string, headers: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    headers,
    // cache: "no-store" to avoid Next's fetch cache here; we manage our own TTL
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}: ${text}`);
  }
  // Proxmox wraps payload as { data: ... }
  const payload = (await res.json()) as { data: T } | T;
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function getCached<T>(key: string): T | undefined {
  const hit = memoryCache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.exp) {
    memoryCache.delete(key);
    return undefined;
  }
  return hit.data as T;
}

function setCached<T>(key: string, data: T, ttl: number) {
  memoryCache.set(key, { data, exp: Date.now() + ttl });
}

export function createHttpsClient(opts: HttpsClientOptions): ProxmoxClient {
  const {
    baseUrl,
    tokenId,
    tokenSecret,
    insecureTLS = false,
    cacheTtlMs = 2000,
    pollIntervalMs = 5000,
  } = opts;

  // In dev-only scenarios, allow skipping TLS verification globally for these requests.
  if (insecureTLS) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const commonHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const auth = authHeader(tokenId, tokenSecret);
  if (auth) {
    commonHeaders.Authorization = auth;
  }

  const api = (path: string) => `${baseUrl.replace(/\/+$/, "")}/api2/json${path}`;

  async function getClusterSummary(signal?: AbortSignal): Promise<ClusterSummary> {
    const cacheKey = "cluster-summary";
    const cached = getCached<ClusterSummary>(cacheKey);
    if (cached) return cached;

    // Option A: cluster/status has online/offline and quorum info
    // Option B: nodes provides resource stats per node
    const [status, nodes] = await Promise.all([
      httpGetJSON<any[]>(api("/cluster/status"), commonHeaders),
      httpGetJSON<any[]>(api("/nodes"), commonHeaders),
    ]);

    const nodeMap: Record<string, NodeSummary> = {};
    for (const n of nodes) {
      nodeMap[n.node] = {
        node: n.node,
        status: n.status,
        uptime: n.uptime,
        loadavg: n.loadavg,
        cpu: n.cpu,
        maxcpu: n.maxcpu,
        memory: {
          total: n.maxmem,
          used: n.mem,
          free: Math.max(0, n.maxmem - n.mem),
        },
        storage: {
          total: n.maxdisk,
          used: n.disk,
          avail: Math.max(0, n.maxdisk - n.disk),
        },
      };
    }

    // Cross-check with cluster status for online/offline
    for (const s of status) {
      if (s.type === "node" && nodeMap[s.name]) {
        nodeMap[s.name].status = s.online ? "online" : "offline";
      }
    }

    const result: ClusterSummary = { nodes: Object.values(nodeMap) };
    setCached(cacheKey, result, cacheTtlMs);
    return result;
  }

  async function getNodeMetrics(node: string, rangeSeconds: number, signal?: AbortSignal): Promise<MetricsSeries> {
    const cacheKey = `metrics:${node}:${rangeSeconds}`;
    const cached = getCached<MetricsSeries>(cacheKey);
    if (cached) return cached;

    // Proxmox rrddata timeframe accepts: hour, day, week, month, year
    // Map range seconds to closest timeframe
    const timeframe = rangeSeconds <= 3600 ? "hour"
      : rangeSeconds <= 86400 ? "day"
      : rangeSeconds <= 604800 ? "week"
      : rangeSeconds <= 2592000 ? "month"
      : "year";

    const params = new URLSearchParams({
      timeframe,
      ds: "cpu,mem",
    });

    const data = await httpGetJSON<any[]>(api(`/nodes/${encodeURIComponent(node)}/rrddata?${params}`), commonHeaders);

    // Each entry example: { time: 1712345678, cpu: 0.12, mem: 123456789, maxmem: 34359738368 }
    const series = data
      .filter((d) => typeof d.time === "number")
      .map((d) => ({
        t: (d.time as number) * 1000,
        cpu: typeof d.cpu === "number" ? d.cpu : 0,
        memUsed: typeof d.mem === "number" ? d.mem : 0,
        memTotal: typeof d.maxmem === "number" ? d.maxmem : 0,
      }))
      // Ensure ascending time
      .sort((a, b) => a.t - b.t);

    const result: MetricsSeries = { node, series };
    setCached(cacheKey, result, cacheTtlMs);
    return result;
  }

  async function* streamEvents(init?: { headers?: IncomingHttpHeaders }) {
    // Proxmox doesn't expose SSE directly; implement a polling-based synthetic stream:
    // - Periodically poll cluster summary and emit status diffs + heartbeat.
    // - Consumers can treat as a stream.
    const interval = Math.max(1000, pollIntervalMs);
    let last: ClusterSummary | null = null;

    while (true) {
      try {
        const now = Date.now();
        yield { type: "heartbeat", ts: now } as EventMessage;

        const current = await getClusterSummary();
        if (last) {
          // Compare node status changes
          const lastMap = new Map(last.nodes.map((n) => [n.node, n]));
          for (const node of current.nodes) {
            const prev = lastMap.get(node.node);
            if (!prev || prev.status !== node.status) {
              yield { type: "status", node: node.node, status: node } as EventMessage;
            }
          }
        } else {
          // First snapshot: send status for all nodes
          for (const node of current.nodes) {
            yield { type: "status", node: node.node, status: node } as EventMessage;
          }
        }
        last = current;
      } catch (e: any) {
        yield { type: "error", message: e?.message ?? String(e) } as EventMessage;
      }

      // Sleep
      await new Promise((r) => setTimeout(r, interval));
    }
  }

  // Mock implementations for unimplemented methods
  const mockImpl = (name: string, data: any = {}) => {
    console.log(`[Mock] Called ${name}`);
    return Promise.resolve(data);
  };

  return {
    getClusterSummary,
    getNodeMetrics,
    streamEvents,
    
    // Fulfill the rest of the ProxmoxClient interface with mock data
    getVmList: () => mockImpl("getVmList", {
      vms: [
        { vmid: 100, name: "vm-100", status: "running", type: "qemu", node: "pve-1", uptime: 7200, cpu: 0.75, maxcpu: 4, mem: { used: 2048, total: 4096, free: 2048 }, disk: { used: 21474836480, total: 42949672960, free: 21474836480 } },
        { vmid: 101, name: "ct-101", status: "stopped", type: "lxc", node: "pve-2", uptime: 0, cpu: 0, maxcpu: 2, mem: { used: 512, total: 1024, free: 512 }, disk: { used: 10737418240, total: 21474836480, free: 10737418240 } },
      ]
    }),
    getVmDetails: (vmid: number) => mockImpl("getVmDetails", { vmid, status: "running", name: `vm-${vmid}`, type: "qemu", node: "pve-1", uptime: 3600, cpu: 0.5, maxcpu: 2, mem: { used: 1024, total: 2048, free: 1024 }, disk: { used: 10737418240, total: 21474836480, free: 10737418240 } }),
    performVmAction: (vmid: number, action: string) => mockImpl("performVmAction", { vmid, action }),
    getHistoricalMetrics: () => mockImpl("getHistoricalMetrics", {
      node: "mock-node",
      series: [
        { t: Date.now() - 3600 * 1000, cpu: 0.1, memUsed: 1024, memTotal: 4096 },
        { t: Date.now(), cpu: 0.2, memUsed: 2048, memTotal: 4096 },
      ]
    }),
    getSystemLogs: () => mockImpl("getSystemLogs", [
      { n: 1, t: "2023-10-27 10:00:00", pri: "info", msg: "System boot" },
      { n: 2, t: "2023-10-27 10:01:00", pri: "error", msg: "Disk failure" },
    ]),
    getBackupJobs: () => mockImpl("getBackupJobs", [
      { id: "backup-1", node: "pve-1", vmid: 100, starttime: Date.now() - 86400 * 1000, status: "finished", type: "full" },
    ]),
    getServiceStatus: () => mockImpl("getServiceStatus", [
      { node: "pve-1", name: "pveproxy", state: "running", description: "PVE API Proxy" },
      { node: "pve-2", name: "pvedaemon", state: "running", description: "PVE Daemon" },
    ]),
    getActiveAlerts: () => mockImpl("getActiveAlerts", [
      { id: "alert-1", node: "pve-1", type: "storage", severity: "warning", message: "Low disk space on /", timestamp: Date.now() },
      { id: "alert-2", node: "pve-2", type: "cpu", severity: "critical", message: "High CPU usage", timestamp: Date.now() },
    ]),
    acknowledgeAlert: (alertId: string) => mockImpl("acknowledgeAlert", { alertId }),
  };
}