"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Chart from "@/components/ui/Chart";
import Icon from "@/components/ui/Icon";
import { showToast } from "@/components/ui/Toast";
import { SectionErrorBoundary } from "@/components/ErrorBoundary";
import { usePerformanceMonitor } from "@/lib/utils/performance";
import type { TimeRange, HistoricalMetrics } from "@/lib/types";
import {
  BarChart3,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  RefreshCw,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// Time range options
const timeRanges: { value: TimeRange; label: string; description: string }[] = [
  { value: '1h', label: '1 Hour', description: 'Last hour with 1-minute intervals' },
  { value: '6h', label: '6 Hours', description: 'Last 6 hours with 5-minute intervals' },
  { value: '24h', label: '24 Hours', description: 'Last 24 hours with 15-minute intervals' },
  { value: '7d', label: '7 Days', description: 'Last 7 days with 1-hour intervals' },
  { value: '30d', label: '30 Days', description: 'Last 30 days with 6-hour intervals' },
];

// Mock nodes for selection
const mockNodes = ['pve-1', 'pve-2', 'pve-3'];

// Metric types
const metricTypes = [
  { key: 'cpu', label: 'CPU Usage', icon: Cpu, color: '#3b82f6', unit: '%' },
  { key: 'memory', label: 'Memory Usage', icon: MemoryStick, color: '#8b5cf6', unit: '%' },
  { key: 'storage', label: 'Storage Usage', icon: HardDrive, color: '#10b981', unit: '%' },
  { key: 'network', label: 'Network I/O', icon: Network, color: '#f59e0b', unit: 'MB/s' },
];

const MetricsPage: React.FC = () => {
  const performanceMetrics = usePerformanceMonitor('MetricsPage');
  
  // State management
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24h');
  const [selectedNodes, setSelectedNodes] = useState<string[]>(['pve-1']);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['cpu', 'memory']);
  const [metricsData, setMetricsData] = useState<Record<string, HistoricalMetrics>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch metrics data
  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newMetricsData: Record<string, HistoricalMetrics> = {};
      
      // Fetch data for each selected node
      for (const node of selectedNodes) {
        const response = await fetch(`/api/proxmox/metrics/historical?node=${node}&timeRange=${selectedTimeRange}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics for ${node}`);
        }
        const data = await response.json();
        newMetricsData[node] = data;
      }
      
      setMetricsData(newMetricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      showToast.error('Failed to load metrics data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedNodes, selectedTimeRange]);

  // Initial load and refresh when dependencies change
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Handle node selection
  const handleNodeToggle = useCallback((node: string) => {
    setSelectedNodes(prev => 
      prev.includes(node) 
        ? prev.filter(n => n !== node)
        : [...prev, node]
    );
  }, []);

  // Handle metric type selection
  const handleMetricToggle = useCallback((metric: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  }, []);

  // Export data as CSV
  const handleExportCSV = useCallback(() => {
    if (Object.keys(metricsData).length === 0) {
      showToast.error('No data to export');
      return;
    }

    const csvData: string[] = [];
    const headers = ['timestamp', 'node', 'cpu', 'memory_used', 'memory_total', 'storage_used', 'storage_total', 'network_rx', 'network_tx'];
    csvData.push(headers.join(','));

    Object.entries(metricsData).forEach(([node, data]) => {
      data.data.forEach(point => {
        const row = [
          new Date(point.timestamp).toISOString(),
          node,
          point.cpu || 0,
          point.memory?.used || 0,
          point.memory?.total || 0,
          point.storage?.used || 0,
          point.storage?.total || 0,
          point.network?.rx || 0,
          point.network?.tx || 0,
        ];
        csvData.push(row.join(','));
      });
    });

    const blob = new Blob([csvData.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proxmox-metrics-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast.success('Metrics data exported successfully');
  }, [metricsData, selectedTimeRange]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const charts: Record<string, any[]> = {};
    
    selectedMetrics.forEach(metricKey => {
      const chartPoints: any[] = [];
      
      Object.entries(metricsData).forEach(([node, data]) => {
        data.data.forEach(point => {
          const timestamp = new Date(point.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            ...(selectedTimeRange === '1h' ? { second: '2-digit' } : {}),
          });
          
          let value = 0;
          switch (metricKey) {
            case 'cpu':
              value = Math.round((point.cpu || 0) * 100);
              break;
            case 'memory':
              value = point.memory ? Math.round((point.memory.used / point.memory.total) * 100) : 0;
              break;
            case 'storage':
              value = point.storage ? Math.round((point.storage.used / point.storage.total) * 100) : 0;
              break;
            case 'network':
              value = point.network ? Math.round((point.network.rx + point.network.tx) / (1024 * 1024)) : 0;
              break;
          }
          
          chartPoints.push({
            time: timestamp,
            value,
            name: `${node}-${timestamp}`,
            node,
          });
        });
      });
      
      charts[metricKey] = chartPoints.sort((a, b) => a.time.localeCompare(b.time));
    });
    
    return charts;
  }, [metricsData, selectedMetrics, selectedTimeRange]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const stats: Record<string, { current: number; avg: number; trend: 'up' | 'down' | 'stable' }> = {};
    
    selectedMetrics.forEach(metricKey => {
      const data = chartData[metricKey] || [];
      if (data.length === 0) {
        stats[metricKey] = { current: 0, avg: 0, trend: 'stable' };
        return;
      }
      
      const values = data.map(d => d.value);
      const current = values[values.length - 1] || 0;
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      // Determine trend (compare last 10% with first 10%)
      const segmentSize = Math.max(1, Math.floor(values.length * 0.1));
      const firstSegment = values.slice(0, segmentSize);
      const lastSegment = values.slice(-segmentSize);
      const firstAvg = firstSegment.reduce((sum, val) => sum + val, 0) / firstSegment.length;
      const lastAvg = lastSegment.reduce((sum, val) => sum + val, 0) / lastSegment.length;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      const diff = Math.abs(lastAvg - firstAvg);
      if (diff > avg * 0.05) { // 5% threshold
        trend = lastAvg > firstAvg ? 'up' : 'down';
      }
      
      stats[metricKey] = { current, avg, trend };
    });
    
    return stats;
  }, [chartData, selectedMetrics]);

  return (
    <div className="min-h-screen w-full p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Advanced Metrics
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Historical performance data and trends
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportCSV}>
              <Icon icon={Download} size="sm" className="mr-2" />
              Export CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={fetchMetrics} loading={isLoading}>
              <Icon icon={RefreshCw} size="sm" className="mr-2" />
              Refresh
            </Button>
          </div>
        </header>

        {/* Controls */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Time Range Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Calendar} size="sm" className="text-blue-600 dark:text-blue-400" />
                <CardTitle>Time Range</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2" role="group" aria-label="Time Range">
                {timeRanges.map(range => (
                  <label key={range.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="timeRange"
                      value={range.value}
                      checked={selectedTimeRange === range.value}
                      onChange={(e) => setSelectedTimeRange(e.target.value as TimeRange)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {range.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {range.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Node Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={BarChart3} size="sm" className="text-green-600 dark:text-green-400" />
                <CardTitle>Nodes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2" role="group" aria-label="Nodes">
                {mockNodes.map(node => (
                  <label key={node} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedNodes.includes(node)}
                      onChange={() => handleNodeToggle(node)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {node}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metric Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={TrendingUp} size="sm" className="text-purple-600 dark:text-purple-400" />
                <CardTitle>Metrics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2" role="group" aria-label="Metrics">
                {metricTypes.map(metric => (
                  <label key={metric.key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(metric.key)}
                      onChange={() => handleMetricToggle(metric.key)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Icon icon={metric.icon} size="sm" className={`text-[${metric.color}]`} />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {metric.label}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Statistics Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {selectedMetrics.map(metricKey => {
            const metric = metricTypes.find(m => m.key === metricKey);
            const stat = statistics[metricKey];
            if (!metric || !stat) return null;

            const TrendIcon = stat.trend === 'up' ? TrendingUp : 
                             stat.trend === 'down' ? TrendingDown : Minus;
            const trendColor = stat.trend === 'up' ? 'text-red-600' : 
                              stat.trend === 'down' ? 'text-green-600' : 'text-gray-600';

            return (
              <Card key={metricKey}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon icon={metric.icon} size="sm" className={`text-[${metric.color}]`} />
                    <CardTitle>{metric.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {stat.current.toFixed(1)}{metric.unit}
                      </span>
                      <Icon icon={TrendIcon} size="sm" className={trendColor} />
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Avg: {stat.avg.toFixed(1)}{metric.unit}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Error Display */}
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Charts */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {selectedMetrics.map(metricKey => {
            const metric = metricTypes.find(m => m.key === metricKey);
            const data = chartData[metricKey] || [];
            
            if (!metric) return null;

            return (
              <SectionErrorBoundary key={metricKey}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon icon={metric.icon} size="sm" className={`text-[${metric.color}]`} />
                      <CardTitle>{metric.label} - {timeRanges.find(r => r.value === selectedTimeRange)?.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex h-64 items-center justify-center">
                        <div className="text-gray-500 dark:text-gray-400">Loading chart data...</div>
                      </div>
                    ) : data.length === 0 ? (
                      <div className="flex h-64 items-center justify-center">
                        <div className="text-gray-500 dark:text-gray-400">No data available</div>
                      </div>
                    ) : (
                      <Chart
                        data={data}
                        type="area"
                        dataKey="value"
                        xAxisKey="time"
                        height={300}
                        color={metric.color}
                        lazy={true}
                      />
                    )}
                  </CardContent>
                </Card>
              </SectionErrorBoundary>
            );
          })}
        </section>
      </div>
    </div>
  );
};

export default MetricsPage;