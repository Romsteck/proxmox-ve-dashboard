"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Chart from "@/components/ui/Chart";
import Icon from "@/components/ui/Icon";
import { showToast } from "@/components/ui/Toast";
import { SectionErrorBoundary } from "@/components/ErrorBoundary";
import { useEventSource } from "@/hooks/useEventSource";
import { useDashboardData } from "@/hooks/useProxmoxData";
import { useUserPreferences } from "@/hooks/useLocalStorage";
import { useDebouncedCallback, usePerformanceMonitor } from "@/lib/utils/performance";
import { API_ENDPOINTS, UI_CONFIG } from "@/lib/constants";
import { NodeSummary as NodeSummaryType, ClusterSummary as ClusterSummaryType } from "@/lib/types";
import {
  RefreshCw,
  Server,
  Cpu,
  MemoryStick,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  HardDrive,
} from "lucide-react";

// Use imported types instead of local definitions
type NodeSummary = NodeSummaryType;
type ClusterSummary = ClusterSummaryType;

function formatBytes(n?: number) {
  if (!n && n !== 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

function pct(part?: number, total?: number) {
  if (!part || !total) return 0;
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

// Mock activity events for demonstration
type ActivityEvent = {
  id: string;
  type: "vm_start" | "vm_stop" | "backup" | "migration" | "alert" | "maintenance";
  message: string;
  timestamp: Date;
  node?: string;
  severity: "info" | "warning" | "error" | "success";
};

const mockActivityEvents: ActivityEvent[] = [
  {
    id: "1",
    type: "vm_start",
    message: "VM 'web-server-01' started successfully",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    node: "pve-node-01",
    severity: "success",
  },
  {
    id: "2",
    type: "backup",
    message: "Backup completed for VM 'database-01'",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    node: "pve-node-02",
    severity: "success",
  },
  {
    id: "3",
    type: "alert",
    message: "High CPU usage detected on node 'pve-node-01'",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    node: "pve-node-01",
    severity: "warning",
  },
  {
    id: "4",
    type: "migration",
    message: "VM 'app-server-03' migrated to pve-node-02",
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    node: "pve-node-02",
    severity: "info",
  },
  {
    id: "5",
    type: "vm_stop",
    message: "VM 'test-environment' stopped",
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    node: "pve-node-01",
    severity: "info",
  },
];

const Dashboard = React.memo(() => {
  // Performance monitoring
  const performanceMetrics = usePerformanceMonitor('Dashboard');
  
  // User preferences
  const [preferences, setPreferences] = useUserPreferences();
  
  // Activity events state
  const [activityEvents] = useState<ActivityEvent[]>(mockActivityEvents);

  // Track manual refresh state
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  // Use optimized dashboard data hook
  const {
    clusterSummary: summary,
    loading,
    error,
    refetch,
    isStale,
  } = useDashboardData({
    enabled: true,
    onSuccess: (data) => {
      // ✅ Only show success toast for manual refreshes, not automatic polling
      if (isManualRefresh) {
        showToast.success("Dashboard data refreshed successfully");
        setIsManualRefresh(false);
      }
    },
    onError: (error) => {
      showToast.error(error.message);
      if (isManualRefresh) {
        setIsManualRefresh(false);
      }
    },
  });

  // Enhanced manual refresh function
  const handleManualRefresh = useCallback(() => {
    setIsManualRefresh(true);
    refetch();
  }, [refetch]);

  // Enhanced SSE connection with better error handling
  const sseConnection = useEventSource(API_ENDPOINTS.EVENTS, {
    enabled: true,
    maxRetries: 5,
    onConnect: () => {
      console.log('SSE connected');
    },
    onDisconnect: () => {
      console.log('SSE disconnected');
    },
    onError: (error) => {
      console.error('SSE error:', error);
      showToast.warning('Live updates temporarily unavailable');
    },
  });

  // Debounced refresh function to prevent excessive API calls
  const debouncedRefresh = useDebouncedCallback(
    () => {
      handleManualRefresh();
    },
    UI_CONFIG.DEBOUNCE_DELAY
  );

  // Mock chart data generation (memoized for performance)
  const generateChartData = useCallback((nodes: NodeSummary[]) => {
    const now = Date.now();
    const cpuData = [];
    const memoryData = [];
    const loadData = [];

    for (let i = 11; i >= 0; i--) {
      const timestamp = now - i * 5 * 60 * 1000; // 5-minute intervals
      const time = new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Generate realistic CPU data
      const avgCpu = nodes.reduce((acc, node) => acc + (node.cpu || 0), 0) / nodes.length;
      const cpuVariation = (Math.random() - 0.5) * 0.2;
      const cpuValue = Math.max(0, Math.min(1, avgCpu + cpuVariation));

      // Generate realistic memory data
      const totalMem = nodes.reduce((acc, node) => acc + (node.memory?.total || 0), 0);
      const usedMem = nodes.reduce((acc, node) => acc + (node.memory?.used || 0), 0);
      const memPct = totalMem > 0 ? usedMem / totalMem : 0;
      const memVariation = (Math.random() - 0.5) * 0.1;
      const memValue = Math.max(0, Math.min(1, memPct + memVariation));

      // Generate load average data
      const avgLoad = nodes.reduce((acc, node) =>
        acc + (node.loadavg?.[0] || 0), 0) / nodes.length;
      const loadVariation = (Math.random() - 0.5) * 0.5;
      const loadValue = Math.max(0, avgLoad + loadVariation);

      cpuData.push({
        time,
        value: Math.round(cpuValue * 100),
        name: time,
      });

      memoryData.push({
        time,
        value: Math.round(memValue * 100),
        name: time,
      });

      loadData.push({
        time,
        value: Number(loadValue.toFixed(2)),
        name: time,
      });
    }

    return { cpuData, memoryData, loadData };
  }, []);

  // Handle SSE status updates with optimized state management
  useEffect(() => {
    if (!sseConnection.lastEvent || sseConnection.lastEvent.type !== "status") return;
    
    // Force a data refresh when we receive status updates
    // This ensures we have the latest data from the API
    debouncedRefresh();
  }, [sseConnection.lastEvent, debouncedRefresh]);

  const totals = useMemo(() => {
    const nodes = summary?.nodes ?? [];
    const online = nodes.filter((n) => n.status === "online").length;
    const totalCpu = nodes.reduce((a, n) => a + (n.maxcpu || 0), 0);
    const usedCpu = nodes.reduce((a, n) => a + Math.round((n.cpu || 0) * (n.maxcpu || 0)), 0);
    const totalMem = nodes.reduce((a, n) => a + (n.memory?.total || 0), 0);
    const usedMem = nodes.reduce((a, n) => a + (n.memory?.used || 0), 0);
    return { count: nodes.length, online, usedCpu, totalCpu, usedMem, totalMem };
  }, [summary]);

  const chartData = useMemo(() => {
    if (!summary?.nodes) return { cpuData: [], memoryData: [], loadData: [] };
    return generateChartData(summary.nodes);
  }, [summary]);

  const getActivityIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'vm_start':
        return CheckCircle;
      case 'vm_stop':
        return XCircle;
      case 'backup':
        return HardDrive;
      case 'migration':
        return TrendingUp;
      case 'alert':
        return AlertTriangle;
      case 'maintenance':
        return Clock;
      default:
        return Activity;
    }
  };

  const getActivityColor = (severity: ActivityEvent['severity']) => {
    switch (severity) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monitor your Proxmox VE infrastructure
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                sseConnection.connected
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  sseConnection.connected ? "bg-green-500" : "bg-yellow-500"
                }`}
              />
              {sseConnection.connected ? "Live connected" : "Connecting…"}
            </span>
            <Button variant="secondary" size="sm" onClick={debouncedRefresh} loading={loading}>
              <Icon icon={RefreshCw} size="sm" className="mr-2" />
              Refresh
            </Button>
          </div>
        </header>

        {error || sseConnection.error ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error || sseConnection.error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Server} size="sm" className="text-blue-600 dark:text-blue-400" />
                <CardTitle>Nodes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {loading ? "…" : totals.count}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {loading ? "" : `${totals.online} online`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Cpu} size="sm" className="text-green-600 dark:text-green-400" />
                <CardTitle>CPU</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {loading ? "…" : `${totals.totalCpu ? Math.round((totals.usedCpu / totals.totalCpu) * 100) : 0}%`}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {loading ? "" : `${totals.usedCpu}/${totals.totalCpu} cores`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={MemoryStick} size="sm" className="text-purple-600 dark:text-purple-400" />
                <CardTitle>Memory</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {loading ? "…" : `${pct(totals.usedMem, totals.totalMem)}%`}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {loading ? "" : `${formatBytes(totals.usedMem)} / ${formatBytes(totals.totalMem)}`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Activity} size="sm" className="text-orange-600 dark:text-orange-400" />
                <CardTitle>Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {sseConnection.connected ? "Receiving live updates" : "Waiting for event stream…"}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Charts Section with Error Boundaries */}
        <SectionErrorBoundary>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SectionErrorBoundary>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon icon={Cpu} size="sm" className="text-blue-600 dark:text-blue-400" />
                    <CardTitle>CPU Usage</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Chart
                    data={chartData.cpuData}
                    type="area"
                    dataKey="value"
                    xAxisKey="name"
                    height={200}
                    color="#3b82f6"
                    lazy={true}
                  />
                </CardContent>
              </Card>
            </SectionErrorBoundary>

            <SectionErrorBoundary>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon icon={MemoryStick} size="sm" className="text-purple-600 dark:text-purple-400" />
                    <CardTitle>Memory Usage</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Chart
                    data={chartData.memoryData}
                    type="area"
                    dataKey="value"
                    xAxisKey="name"
                    height={200}
                    color="#8b5cf6"
                    lazy={true}
                  />
                </CardContent>
              </Card>
            </SectionErrorBoundary>

            <SectionErrorBoundary>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon icon={TrendingUp} size="sm" className="text-green-600 dark:text-green-400" />
                    <CardTitle>Load Average</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Chart
                    data={chartData.loadData}
                    type="line"
                    dataKey="value"
                    xAxisKey="name"
                    height={200}
                    color="#10b981"
                    lazy={true}
                  />
                </CardContent>
              </Card>
            </SectionErrorBoundary>
          </section>
        </SectionErrorBoundary>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Server} size="sm" className="text-blue-600 dark:text-blue-400" />
                <CardTitle>Nodes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="py-2 pr-4">Node</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">CPU</th>
                      <th className="py-2 pr-4">Memory</th>
                      <th className="py-2 pr-4">Load</th>
                      <th className="py-2 pr-4">Uptime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {(summary?.nodes ?? []).map((n) => (
                      <tr key={n.node} className="align-middle">
                        <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">
                          {n.node}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs ${
                              n.status === "online"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                n.status === "online" ? "bg-green-500" : "bg-red-500"
                              }`}
                            />
                            {n.status}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {n.cpu != null && n.maxcpu ? `${Math.round(n.cpu * 100)}% of ${n.maxcpu}` : "-"}
                        </td>
                        <td className="py-2 pr-4">
                          {n.memory ? `${formatBytes(n.memory.used)} / ${formatBytes(n.memory.total)}` : "-"}
                        </td>
                        <td className="py-2 pr-4">
                          {Array.isArray(n.loadavg) ? n.loadavg.join(", ") : "-"}
                        </td>
                        <td className="py-2 pr-4">
                          {n.uptime ? `${Math.floor(n.uptime / 3600)}h` : "-"}
                        </td>
                      </tr>
                    ))}
                    {loading && (
                      <tr>
                        <td className="py-3 text-gray-500 dark:text-gray-400" colSpan={6}>
                          Loading…
                        </td>
                      </tr>
                    )}
                    {!loading && (summary?.nodes?.length ?? 0) === 0 && (
                      <tr>
                        <td className="py-3 text-gray-500 dark:text-gray-400" colSpan={6}>
                          No nodes found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Activity} size="sm" className="text-orange-600 dark:text-orange-400" />
                <CardTitle>Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityEvents.map((event) => {
                  const IconComponent = getActivityIcon(event.type);
                  const colorClass = getActivityColor(event.severity);
                  
                  return (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 ${colorClass}`}>
                        <Icon icon={IconComponent} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {event.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {event.node && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {event.node}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(event.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
