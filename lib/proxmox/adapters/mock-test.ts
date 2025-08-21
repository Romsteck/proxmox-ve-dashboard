import type { IncomingHttpHeaders } from "http";
import type {
  ProxmoxClient,
  VmAction,
} from "../client";
import type {
  ClusterSummary,
  EventMessage,
  MetricsSeries,
  NodeSummary,
  VmResource,
  VmList,
  TimeRange,
  HistoricalMetrics,
  LogEntry,
  BackupJob,
  ServiceStatus,
  Alert,
} from "../../types";

const NODES = ["pve-1", "pve-2", "pve-3"];

function seededRandom(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genNodeSummary(name: string, now = Date.now()): NodeSummary {
  const r = seededRandom(name.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  const totalMem = 32 * 1024 ** 3;
  const usedMem = Math.floor(totalMem * (0.3 + r() * 0.6));
  const totalDisk = 500 * 1024 ** 3;
  const usedDisk = Math.floor(totalDisk * (0.2 + r() * 0.7));
  const cpu = 0.05 + r() * 0.6;
  return {
    node: name,
    status: r() > 0.05 ? "online" : "offline",
    uptime: Math.floor(now / 1000 - r() * 100000),
    loadavg: [Number((cpu * 2).toFixed(2)), Number((cpu * 1.5).toFixed(2)), Number((cpu).toFixed(2))],
    cpu,
    maxcpu: 16,
    memory: {
      total: totalMem,
      used: usedMem,
      free: totalMem - usedMem,
    },
    storage: {
      total: totalDisk,
      used: usedDisk,
      avail: totalDisk - usedDisk,
    },
  };
}

function genSeries(node: string, points = 60, stepMs = 5000): MetricsSeries {
  const base = Date.now() - points * stepMs;
  const rnd = seededRandom(node.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  const totalMem = 32 * 1024 ** 3;
  const series = Array.from({ length: points }, (_, i) => {
    const t = base + i * stepMs;
    const cpu = 0.1 + 0.1 * Math.sin(i / 6) + rnd() * 0.05;
    const memUsed = Math.floor(totalMem * (0.4 + 0.1 * Math.sin(i / 10) + rnd() * 0.02));
    return {
      t,
      cpu: Math.max(0, Math.min(1, cpu)),
      memUsed,
      memTotal: totalMem,
    };
  });
  return { node, series };
}

export function createTestMockClient(): ProxmoxClient {
  async function getClusterSummary(): Promise<ClusterSummary> {
    return {
      nodes: NODES.map((n) => genNodeSummary(n)),
    };
  }

  async function getNodeMetrics(node: string, rangeSeconds: number): Promise<MetricsSeries> {
    const points = Math.max(30, Math.min(300, Math.floor(rangeSeconds / 5)));
    return genSeries(node, points, 5000);
  }

  async function* streamEvents(_init?: { headers?: IncomingHttpHeaders }) {
    let iter = 0;
    for (const n of NODES) {
      yield { type: "status", node: n, status: genNodeSummary(n) } as EventMessage;
    }
    while (true) {
      yield { type: "heartbeat", ts: Date.now() } as EventMessage;
      if (iter++ % 6 === 0) {
        const n = NODES[iter % NODES.length];
        yield { type: "status", node: n, status: genNodeSummary(n) } as EventMessage;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  async function getVmList(): Promise<VmList> {
    const vms: VmResource[] = [];
    let vmid = 100;
    for (const node of NODES) {
      for (let i = 0; i < 3; i++) {
        const r = seededRandom(vmid);
        vms.push({
          vmid: vmid++,
          name: `vm-${node}-${i + 1}`,
          type: 'qemu',
          status: r() > 0.2 ? 'running' : r() > 0.5 ? 'stopped' : 'paused',
          node,
          cpu: r() * 0.8,
          maxcpu: Math.floor(2 + r() * 6),
          memory: {
            used: Math.floor(1024 * 1024 * 1024 * (1 + r() * 7)),
            max: Math.floor(1024 * 1024 * 1024 * (2 + r() * 14)),
          },
          disk: {
            used: Math.floor(1024 * 1024 * 1024 * (10 + r() * 90)),
            max: Math.floor(1024 * 1024 * 1024 * (20 + r() * 480)),
          },
          uptime: r() > 0.2 ? Math.floor(r() * 1000000) : undefined,
          template: false,
          tags: r() > 0.7 ? 'production,web' : r() > 0.5 ? 'development' : undefined,
        });
      }
      for (let i = 0; i < 2; i++) {
        const r = seededRandom(vmid);
        vms.push({
          vmid: vmid++,
          name: `ct-${node}-${i + 1}`,
          type: 'lxc',
          status: r() > 0.15 ? 'running' : 'stopped',
          node,
          cpu: r() * 0.4,
          maxcpu: Math.floor(1 + r() * 3),
          memory: {
            used: Math.floor(1024 * 1024 * 1024 * (0.5 + r() * 3.5)),
            max: Math.floor(1024 * 1024 * 1024 * (1 + r() * 7)),
          },
          disk: {
            used: Math.floor(1024 * 1024 * 1024 * (2 + r() * 18)),
            max: Math.floor(1024 * 1024 * 1024 * (5 + r() * 95)),
          },
          uptime: r() > 0.15 ? Math.floor(r() * 500000) : undefined,
          template: false,
          tags: r() > 0.6 ? 'container,service' : undefined,
        });
      }
    }
    return { vms };
  }

  async function getVmDetails(node: string, vmid: number): Promise<VmResource> {
    const r = seededRandom(vmid);
    const isQemu = vmid < 200;
    return {
      vmid,
      name: `${isQemu ? 'vm' : 'ct'}-${node}-${vmid}`,
      type: isQemu ? 'qemu' : 'lxc',
      status: r() > 0.2 ? 'running' : r() > 0.5 ? 'stopped' : 'paused',
      node,
      cpu: r() * (isQemu ? 0.8 : 0.4),
      maxcpu: Math.floor((isQemu ? 2 : 1) + r() * (isQemu ? 6 : 3)),
      memory: {
        used: Math.floor(1024 * 1024 * 1024 * ((isQemu ? 1 : 0.5) + r() * (isQemu ? 7 : 3.5))),
        max: Math.floor(1024 * 1024 * 1024 * ((isQemu ? 2 : 1) + r() * (isQemu ? 14 : 7))),
      },
      disk: {
        used: Math.floor(1024 * 1024 * 1024 * ((isQemu ? 10 : 2) + r() * (isQemu ? 90 : 18))),
        max: Math.floor(1024 * 1024 * 1024 * ((isQemu ? 20 : 5) + r() * (isQemu ? 480 : 95))),
      },
      uptime: r() > 0.2 ? Math.floor(r() * 1000000) : undefined,
      template: false,
      tags: r() > 0.7 ? (isQemu ? 'production,web' : 'container,service') : undefined,
    };
  }

  async function performVmAction(node: string, vmid: number, action: VmAction): Promise<{ success: boolean; message?: string }> {
    const r = seededRandom(vmid + action.length);
    const success = r() > 0.05;
    return {
      success,
      message: success
        ? `Successfully ${action}ed VM/CT ${vmid} on ${node}`
        : `Failed to ${action} VM/CT ${vmid}: ${r() > 0.5 ? 'Resource busy' : 'Permission denied'}`,
    };
  }

  async function getHistoricalMetrics(node: string, timeRange: TimeRange, vmid?: number): Promise<HistoricalMetrics> {
    const ranges = {
      '1h': { points: 60, stepMs: 60 * 1000 },
      '6h': { points: 72, stepMs: 5 * 60 * 1000 },
      '24h': { points: 96, stepMs: 15 * 60 * 1000 },
      '7d': { points: 168, stepMs: 60 * 60 * 1000 },
      '30d': { points: 120, stepMs: 6 * 60 * 60 * 1000 },
    };
    const { points, stepMs } = ranges[timeRange];
    const base = Date.now() - points * stepMs;
    const rnd = seededRandom((node + (vmid || 0)).split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    const data = Array.from({ length: points }, (_, i) => {
      const timestamp = base + i * stepMs;
      const cpuBase = vmid ? 0.3 : 0.15;
      const memBase = vmid ? 0.6 : 0.4;
      return {
        timestamp,
        cpu: Math.max(0, Math.min(1, cpuBase + 0.2 * Math.sin(i / 10) + rnd() * 0.1)),
        memory: {
          used: Math.floor(32 * 1024 ** 3 * (memBase + 0.1 * Math.sin(i / 8) + rnd() * 0.05)),
          total: 32 * 1024 ** 3,
        },
        storage: {
          used: Math.floor(500 * 1024 ** 3 * (0.3 + 0.05 * Math.sin(i / 20) + rnd() * 0.02)),
          total: 500 * 1024 ** 3,
        },
        network: {
          rx: Math.floor(1024 * 1024 * (10 + 50 * Math.sin(i / 6) + rnd() * 20)),
          tx: Math.floor(1024 * 1024 * (5 + 25 * Math.sin(i / 6) + rnd() * 10)),
        },
      };
    });
    return { node, vmid, timeRange, data };
  }

  async function getSystemLogs(node: string, limit = 50): Promise<LogEntry[]> {
    const levels = ['debug', 'info', 'warning', 'error'] as const;
    const sources = ['kernel', 'systemd', 'pveproxy', 'pvedaemon', 'qemu', 'lxc'];
    const messages = [
      'System startup completed',
      'VM migration started',
      'Backup job completed successfully',
      'High CPU usage detected',
      'Network interface down',
      'Storage threshold exceeded',
      'Authentication failed',
      'Service restarted',
    ];
    const logs: LogEntry[] = [];
    const now = Date.now();
    for (let i = 0; i < limit; i++) {
      const r = seededRandom(i + node.length);
      logs.push({
        timestamp: now - i * 60000 - Math.floor(r() * 300000),
        level: levels[Math.floor(r() * levels.length)],
        source: sources[Math.floor(r() * sources.length)],
        message: messages[Math.floor(r() * messages.length)],
        node,
        vmid: r() > 0.7 ? Math.floor(100 + r() * 50) : undefined,
      });
    }
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  async function getBackupJobs(node?: string): Promise<BackupJob[]> {
    const jobs: BackupJob[] = [];
    const targetNodes = node ? [node] : NODES;
    for (const n of targetNodes) {
      for (let i = 0; i < 5; i++) {
        const r = seededRandom(n.length + i);
        const vmid = 100 + Math.floor(r() * 50);
        const startTime = new Date(Date.now() - Math.floor(r() * 7 * 24 * 60 * 60 * 1000));
        const duration = Math.floor(r() * 3600000);
        jobs.push({
          id: `backup-${n}-${vmid}-${i}`,
          vmid,
          node: n,
          type: r() > 0.3 ? 'vzdump' : 'snapshot',
          status: r() > 0.1 ? 'completed' : r() > 0.5 ? 'running' : 'failed',
          startTime,
          endTime: new Date(startTime.getTime() + duration),
          size: Math.floor(r() * 50 * 1024 ** 3),
          notes: r() > 0.7 ? 'Scheduled backup' : undefined,
        });
      }
    }
    return jobs.sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0));
  }

  async function getServiceStatus(node: string): Promise<ServiceStatus[]> {
    const services = [
      'pveproxy', 'pvedaemon', 'pvestatd', 'pve-cluster',
      'corosync', 'ceph-mon', 'ceph-mgr', 'ceph-osd',
      'systemd-timesyncd', 'ssh', 'postfix',
    ];
    return services.map((name, i) => {
      const r = seededRandom(node.length + i);
      return {
        name,
        status: r() > 0.05 ? 'active' : r() > 0.5 ? 'inactive' : 'failed',
        enabled: r() > 0.1,
        description: `${name} service`,
      };
    });
  }

  async function getActiveAlerts(): Promise<Alert[]> {
    const now = new Date();
    const alerts: Alert[] = [
      {
        id: 'alert-1',
        thresholdId: 'threshold-cpu',
        message: 'High CPU usage on pve-1',
        severity: 'warning',
        timestamp: new Date(now.getTime() - 3600000),
        node: 'pve-1',
        acknowledged: false,
      },
      {
        id: 'alert-2',
        thresholdId: 'threshold-disk',
        message: 'Critical disk space on pve-2',
        severity: 'critical',
        timestamp: new Date(now.getTime() - 7200000),
        node: 'pve-2',
        vmid: 101,
        acknowledged: false,
      },
      {
        id: 'alert-3',
        thresholdId: 'threshold-mem',
        message: 'Memory usage high on pve-3',
        severity: 'warning',
        timestamp: new Date(now.getTime() - 10800000),
        node: 'pve-3',
        acknowledged: true,
        acknowledgedBy: 'admin',
        acknowledgedAt: new Date(now.getTime() - 1800000),
      },
      {
        id: 'alert-4',
        thresholdId: 'threshold-load',
        message: 'High load average on pve-1',
        severity: 'info',
        timestamp: new Date(now.getTime() - 14400000),
        node: 'pve-1',
        acknowledged: false,
      },
      {
        id: 'alert-5',
        thresholdId: 'threshold-io',
        message: 'Disk I/O delay on pve-2',
        severity: 'error',
        timestamp: new Date(now.getTime() - 18000000),
        node: 'pve-2',
        vmid: 102,
        acknowledged: false,
      },
    ];
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async function acknowledgeAlert(alertId: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  return {
    getClusterSummary,
    getNodeMetrics,
    streamEvents,
    getVmList,
    getVmDetails,
    performVmAction,
    getHistoricalMetrics,
    getSystemLogs,
    getBackupJobs,
    getServiceStatus,
    getActiveAlerts,
    acknowledgeAlert,
  };
}