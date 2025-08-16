"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { showToast } from "@/components/ui/Toast";
import { SectionErrorBoundary } from "@/components/ErrorBoundary";
import { usePerformanceMonitor } from "@/lib/utils/performance";
import type { LogEntry, BackupJob, ServiceStatus } from "@/lib/types";
import {
  Monitor,
  FileText,
  HardDrive,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Download,
  Play,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Info,
  AlertCircle,
} from "lucide-react";

// Mock nodes for selection
const mockNodes = ['pve-1', 'pve-2', 'pve-3'];

const MonitoringPage: React.FC = () => {
  const performanceMetrics = usePerformanceMonitor('MonitoringPage');
  
  // State management
  const [selectedNode, setSelectedNode] = useState<string>('pve-1');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [backups, setBackups] = useState<BackupJob[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [isLoading, setIsLoading] = useState({ logs: false, backups: false, services: false });
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<'all' | 'debug' | 'info' | 'warning' | 'error'>('all');

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(prev => ({ ...prev, logs: true }));
      const response = await fetch(`/api/proxmox/logs?node=${selectedNode}&limit=100`);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      showToast.error('Failed to load logs');
    } finally {
      setIsLoading(prev => ({ ...prev, logs: false }));
    }
  }, [selectedNode]);

  // Fetch backups
  const fetchBackups = useCallback(async () => {
    try {
      setIsLoading(prev => ({ ...prev, backups: true }));
      const response = await fetch(`/api/proxmox/backups?node=${selectedNode}`);
      if (!response.ok) {
        throw new Error('Failed to fetch backups');
      }
      const data = await response.json();
      setBackups(data.backups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch backups');
      showToast.error('Failed to load backups');
    } finally {
      setIsLoading(prev => ({ ...prev, backups: false }));
    }
  }, [selectedNode]);

  // Fetch services
  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(prev => ({ ...prev, services: true }));
      const response = await fetch(`/api/proxmox/services?node=${selectedNode}`);
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      const data = await response.json();
      setServices(data.services || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
      showToast.error('Failed to load services');
    } finally {
      setIsLoading(prev => ({ ...prev, services: false }));
    }
  }, [selectedNode]);

  // Fetch all data
  const fetchAll = useCallback(() => {
    fetchLogs();
    fetchBackups();
    fetchServices();
  }, [fetchLogs, fetchBackups, fetchServices]);

  // Initial load and refresh when node changes
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLevel = logLevelFilter === 'all' || log.level === logLevelFilter;
      
      return matchesSearch && matchesLevel;
    });
  }, [logs, searchTerm, logLevelFilter]);

  // Statistics
  const stats = useMemo(() => {
    const activeServices = services.filter(s => s.status === 'active').length;
    const runningBackups = backups.filter(b => b.status === 'running').length;
    const failedBackups = backups.filter(b => b.status === 'failed').length;
    const errorLogs = logs.filter(l => l.level === 'error').length;
    
    return {
      services: { total: services.length, active: activeServices },
      backups: { total: backups.length, running: runningBackups, failed: failedBackups },
      logs: { total: logs.length, errors: errorLogs },
    };
  }, [services, backups, logs]);

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Get log level icon and color
  const getLogLevelDisplay = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return { icon: XCircle, color: 'text-red-600 dark:text-red-400' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400' };
      case 'info':
        return { icon: Info, color: 'text-blue-600 dark:text-blue-400' };
      case 'debug':
        return { icon: Settings, color: 'text-gray-600 dark:text-gray-400' };
      default:
        return { icon: Info, color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  // Get service status display
  const getServiceStatusDisplay = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'active':
        return { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
      case 'inactive':
        return { icon: Square, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900/30' };
      default:
        return { icon: AlertCircle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
    }
  };

  // Get backup status display
  const getBackupStatusDisplay = (status: BackupJob['status']) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-600 dark:text-green-400' };
      case 'running':
        return { icon: Play, color: 'text-blue-600 dark:text-blue-400' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-600 dark:text-red-400' };
      case 'scheduled':
        return { icon: Clock, color: 'text-yellow-600 dark:text-yellow-400' };
      default:
        return { icon: AlertCircle, color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Advanced Monitoring
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              System logs, backup jobs, and service status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {mockNodes.map(node => (
                <option key={node} value={node}>{node}</option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={fetchAll}>
              <Icon icon={RefreshCw} size="sm" className="mr-2" />
              Refresh All
            </Button>
          </div>
        </header>

        {/* Statistics Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Settings} size="sm" className="text-blue-600 dark:text-blue-400" />
                <CardTitle>Services</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.services.active}/{stats.services.total}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Active</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={HardDrive} size="sm" className="text-green-600 dark:text-green-400" />
                <CardTitle>Backups</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.backups.total}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Jobs</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Play} size="sm" className="text-blue-600 dark:text-blue-400" />
                <CardTitle>Running</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.backups.running}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Backups</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={XCircle} size="sm" className="text-red-600 dark:text-red-400" />
                <CardTitle>Failed</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.backups.failed}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Backups</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={FileText} size="sm" className="text-purple-600 dark:text-purple-400" />
                <CardTitle>Log Entries</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.logs.total}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={AlertTriangle} size="sm" className="text-red-600 dark:text-red-400" />
                <CardTitle>Errors</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.logs.errors}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Log Errors</div>
            </CardContent>
          </Card>
        </section>

        {/* Error Display */}
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* System Logs */}
          <SectionErrorBoundary>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon={FileText} size="sm" className="text-purple-600 dark:text-purple-400" />
                    <CardTitle>System Logs</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Icon icon={Search} size="sm" className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-32 rounded border border-gray-300 bg-white pl-8 pr-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                    <select
                      value={logLevelFilter}
                      onChange={(e) => setLogLevelFilter(e.target.value as any)}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    >
                      <option value="all">All Levels</option>
                      <option value="error">Error</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {isLoading.logs ? (
                    <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                      Loading logs...
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                      No logs found.
                    </div>
                  ) : (
                    filteredLogs.map((log, index) => {
                      const { icon: LogIcon, color } = getLogLevelDisplay(log.level);
                      return (
                        <div key={index} className="rounded border p-2 text-xs">
                          <div className="flex items-start gap-2">
                            <Icon icon={LogIcon} size="xs" className={color} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {log.source}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {formatTimestamp(log.timestamp)}
                                </span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 break-words">
                                {log.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </SectionErrorBoundary>

          {/* Services Status */}
          <SectionErrorBoundary>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon icon={Settings} size="sm" className="text-blue-600 dark:text-blue-400" />
                  <CardTitle>Services Status</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {isLoading.services ? (
                    <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                      Loading services...
                    </div>
                  ) : services.length === 0 ? (
                    <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                      No services found.
                    </div>
                  ) : (
                    services.map((service) => {
                      const { icon: StatusIcon, color, bg } = getServiceStatusDisplay(service.status);
                      return (
                        <div key={service.name} className="flex items-center justify-between rounded border p-2">
                          <div className="flex items-center gap-2">
                            <Icon icon={StatusIcon} size="sm" className={color} />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {service.name}
                              </div>
                              {service.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {service.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${bg} ${color}`}>
                              {service.status}
                            </span>
                            {service.enabled && (
                              <span className="text-xs text-green-600 dark:text-green-400">
                                Enabled
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </SectionErrorBoundary>
        </div>

        {/* Backup Jobs */}
        <SectionErrorBoundary>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={HardDrive} size="sm" className="text-green-600 dark:text-green-400" />
                <CardTitle>Backup Jobs</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="py-2 pr-4">VM ID</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Start Time</th>
                      <th className="py-2 pr-4">Duration</th>
                      <th className="py-2 pr-4">Size</th>
                      <th className="py-2 pr-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {isLoading.backups ? (
                      <tr>
                        <td className="py-4 text-gray-500 dark:text-gray-400" colSpan={7}>
                          Loading backup jobs...
                        </td>
                      </tr>
                    ) : backups.length === 0 ? (
                      <tr>
                        <td className="py-4 text-gray-500 dark:text-gray-400" colSpan={7}>
                          No backup jobs found.
                        </td>
                      </tr>
                    ) : (
                      backups.map((backup) => {
                        const { icon: StatusIcon, color } = getBackupStatusDisplay(backup.status);
                        const duration = backup.startTime && backup.endTime 
                          ? Math.round((backup.endTime.getTime() - backup.startTime.getTime()) / 1000 / 60)
                          : null;
                        
                        return (
                          <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2 pr-4 font-mono text-sm">
                              {backup.vmid}
                            </td>
                            <td className="py-2 pr-4">
                              <span className="capitalize">{backup.type}</span>
                            </td>
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-2">
                                <Icon icon={StatusIcon} size="sm" className={color} />
                                <span className="capitalize">{backup.status}</span>
                              </div>
                            </td>
                            <td className="py-2 pr-4">
                              {backup.startTime ? formatTimestamp(backup.startTime.getTime()) : '-'}
                            </td>
                            <td className="py-2 pr-4">
                              {duration ? `${duration}m` : '-'}
                            </td>
                            <td className="py-2 pr-4">
                              {backup.size ? `${(backup.size / (1024 ** 3)).toFixed(1)} GB` : '-'}
                            </td>
                            <td className="py-2 pr-4">
                              {backup.notes || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </SectionErrorBoundary>
      </div>
    </div>
  );
};

export default MonitoringPage;