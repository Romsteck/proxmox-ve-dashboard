"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { showToast } from "@/components/ui/Toast";
import { SectionErrorBoundary } from "@/components/ErrorBoundary";
import { usePerformanceMonitor } from "@/lib/utils/performance";
import { API_ENDPOINTS } from "@/lib/constants";
import type { VmResource, VmStatus, VmType } from "@/lib/types";
import {
  HardDrive,
  Users,
  Play,
  Square,
  RotateCcw,
  Pause,
  Power,
  Search,
  RefreshCw,
  Cpu,
  MemoryStick,
  Clock,
  Tag,
} from "lucide-react";

// VM Action component
interface VmActionButtonProps {
  vm: VmResource;
  action: 'start' | 'stop' | 'restart' | 'pause' | 'resume';
  onAction: (vmid: number, action: string) => void;
  loading?: boolean;
}

const VmActionButton: React.FC<VmActionButtonProps> = ({ vm, action, onAction, loading }) => {
  const getActionIcon = () => {
    switch (action) {
      case 'start': return Play;
      case 'stop': return Square;
      case 'restart': return RotateCcw;
      case 'pause': return Pause;
      case 'resume': return Play;
      default: return Power;
    }
  };

  const getActionColor = () => {
    switch (action) {
      case 'start': return 'text-green-600';
      case 'stop': return 'text-red-600';
      case 'restart': return 'text-orange-600';
      case 'pause': return 'text-yellow-600';
      case 'resume': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const isActionAvailable = () => {
    switch (action) {
      case 'start': return vm.status === 'stopped';
      case 'stop': return vm.status === 'running';
      case 'restart': return vm.status === 'running';
      case 'pause': return vm.status === 'running';
      case 'resume': return vm.status === 'paused';
      default: return false;
    }
  };

  if (!isActionAvailable()) return null;

  return (
    <button
      onClick={() => onAction(vm.vmid, action)}
      disabled={loading}
      className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${getActionColor()}`}
      title={`${action.charAt(0).toUpperCase() + action.slice(1)} ${vm.type.toUpperCase()} ${vm.vmid}`}
    >
      <Icon icon={getActionIcon()} size="sm" />
    </button>
  );
};

// VM Status Badge component
interface VmStatusBadgeProps {
  status: VmStatus;
}

const VmStatusBadge: React.FC<VmStatusBadgeProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'stopped': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'suspended': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'template': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusDot = () => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-gray-500';
      case 'paused': return 'bg-yellow-500';
      case 'suspended': return 'bg-blue-500';
      case 'template': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor()}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot()}`} />
      {status}
    </span>
  );
};

// Format bytes utility
const formatBytes = (bytes?: number) => {
  if (!bytes && bytes !== 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
};

// Format uptime utility
const formatUptime = (seconds?: number) => {
  if (!seconds) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const VmsPage: React.FC = () => {
  const performanceMetrics = usePerformanceMonitor('VmsPage');
  
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<VmStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<VmType | 'all'>('all');
  const [nodeFilter, setNodeFilter] = useState<string>('all');

  // State for VM data
  const [vmData, setVmData] = useState<{ vms: VmResource[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Fetch VMs data
  const fetchVms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/proxmox/vms');
      if (!response.ok) {
        throw new Error('Failed to fetch VMs');
      }
      const data = await response.json();
      setVmData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch VMs');
      showToast.error('Failed to load VMs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchVms();
    const interval = setInterval(fetchVms, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchVms]);

  const handleVmAction = useCallback(async (vmid: number, action: string) => {
    const vm = vmData?.vms?.find((v: VmResource) => v.vmid === vmid);
    if (!vm) return;
    
    try {
      setActionLoading(vmid);
      const response = await fetch(`/api/proxmox/vms/${vmid}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node: vm.node, action }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Action failed');
      }
      
      showToast.success(`Successfully ${action}ed VM/CT ${vmid}`);
      // Refresh data after action
      await fetchVms();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action failed';
      showToast.error(`Failed to ${action} VM/CT ${vmid}: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  }, [vmData?.vms, fetchVms]);

  // Filter and search VMs
  const filteredVms = useMemo(() => {
    if (!vmData?.vms) return [];
    
    return vmData.vms.filter((vm: VmResource) => {
      const matchesSearch = !searchTerm || 
        vm.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vm.vmid.toString().includes(searchTerm) ||
        vm.node.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || vm.status === statusFilter;
      const matchesType = typeFilter === 'all' || vm.type === typeFilter;
      const matchesNode = nodeFilter === 'all' || vm.node === nodeFilter;
      
      return matchesSearch && matchesStatus && matchesType && matchesNode;
    });
  }, [vmData?.vms, searchTerm, statusFilter, typeFilter, nodeFilter]);

  // Get unique nodes for filter
  const availableNodes = useMemo(() => {
    if (!vmData?.vms) return [];
    return [...new Set(vmData.vms.map((vm: VmResource) => vm.node))].sort();
  }, [vmData?.vms]);

  // Statistics
  const stats = useMemo(() => {
    if (!vmData?.vms) return { total: 0, running: 0, stopped: 0, qemu: 0, lxc: 0 };
    
    const vms = vmData.vms;
    return {
      total: vms.length,
      running: vms.filter((vm: VmResource) => vm.status === 'running').length,
      stopped: vms.filter((vm: VmResource) => vm.status === 'stopped').length,
      qemu: vms.filter((vm: VmResource) => vm.type === 'qemu').length,
      lxc: vms.filter((vm: VmResource) => vm.type === 'lxc').length,
    };
  }, [vmData?.vms]);

  return (
    <div className="min-h-screen w-full p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage your VMs and LXC containers
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchVms} loading={isLoading}>
            <Icon icon={RefreshCw} size="sm" className="mr-2" />
            Refresh
          </Button>
        </header>

        {/* Statistics Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={HardDrive} size="sm" className="text-blue-600 dark:text-blue-400" />
                <CardTitle>Total</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.total}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Play} size="sm" className="text-green-600 dark:text-green-400" />
                <CardTitle>Running</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.running}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Square} size="sm" className="text-gray-600 dark:text-gray-400" />
                <CardTitle>Stopped</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.stopped}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={HardDrive} size="sm" className="text-purple-600 dark:text-purple-400" />
                <CardTitle>VMs</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.qemu}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Users} size="sm" className="text-orange-600 dark:text-orange-400" />
                <CardTitle>Containers</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.lxc}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Filters and Search */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Icon icon={Search} size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search VMs and containers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as VmStatus | 'all')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
              <option value="paused">Paused</option>
              <option value="suspended">Suspended</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as VmType | 'all')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="all">All Types</option>
              <option value="qemu">VMs</option>
              <option value="lxc">Containers</option>
            </select>
            
            <select
              value={nodeFilter}
              onChange={(e) => setNodeFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="all">All Nodes</option>
              {availableNodes.map((node: string) => (
                <option key={node} value={node}>{node}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* VMs Table */}
        <SectionErrorBoundary>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Virtual Machines & Containers ({filteredVms.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="py-3 pr-4">ID</th>
                      <th className="py-3 pr-4">Name</th>
                      <th className="py-3 pr-4">Type</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Node</th>
                      <th className="py-3 pr-4">CPU</th>
                      <th className="py-3 pr-4">Memory</th>
                      <th className="py-3 pr-4">Disk</th>
                      <th className="py-3 pr-4">Uptime</th>
                      <th className="py-3 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {isLoading ? (
                      <tr>
                        <td className="py-4 text-gray-500 dark:text-gray-400" colSpan={10}>
                          Loading VMs and containers...
                        </td>
                      </tr>
                    ) : filteredVms.length === 0 ? (
                      <tr>
                        <td className="py-4 text-gray-500 dark:text-gray-400" colSpan={10}>
                          No VMs or containers found.
                        </td>
                      </tr>
                    ) : (
                      filteredVms.map((vm: VmResource) => (
                        <tr key={vm.vmid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-3 pr-4 font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                            {vm.vmid}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {vm.name || `${vm.type}-${vm.vmid}`}
                              </span>
                              {vm.tags && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Icon icon={Tag} size="xs" className="text-gray-400" />
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {vm.tags}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                              vm.type === 'qemu' 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                            }`}>
                              <Icon icon={vm.type === 'qemu' ? HardDrive : Users} size="xs" />
                              {vm.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <VmStatusBadge status={vm.status} />
                          </td>
                          <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                            {vm.node}
                          </td>
                          <td className="py-3 pr-4">
                            {vm.cpu !== undefined && vm.maxcpu ? (
                              <div className="flex items-center gap-2">
                                <Icon icon={Cpu} size="xs" className="text-gray-400" />
                                <span className="text-gray-700 dark:text-gray-300">
                                  {Math.round(vm.cpu * 100)}% of {vm.maxcpu}
                                </span>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="py-3 pr-4">
                            {vm.memory?.used && vm.memory?.max ? (
                              <div className="flex items-center gap-2">
                                <Icon icon={MemoryStick} size="xs" className="text-gray-400" />
                                <span className="text-gray-700 dark:text-gray-300">
                                  {formatBytes(vm.memory.used)} / {formatBytes(vm.memory.max)}
                                </span>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="py-3 pr-4">
                            {vm.disk?.used && vm.disk?.max ? (
                              <div className="flex items-center gap-2">
                                <Icon icon={HardDrive} size="xs" className="text-gray-400" />
                                <span className="text-gray-700 dark:text-gray-300">
                                  {formatBytes(vm.disk.used)} / {formatBytes(vm.disk.max)}
                                </span>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <Icon icon={Clock} size="xs" className="text-gray-400" />
                              <span className="text-gray-700 dark:text-gray-300">
                                {formatUptime(vm.uptime)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-1">
                              <VmActionButton
                                vm={vm}
                                action="start"
                                onAction={handleVmAction}
                                loading={actionLoading === vm.vmid}
                              />
                              <VmActionButton
                                vm={vm}
                                action="stop"
                                onAction={handleVmAction}
                                loading={actionLoading === vm.vmid}
                              />
                              <VmActionButton
                                vm={vm}
                                action="restart"
                                onAction={handleVmAction}
                                loading={actionLoading === vm.vmid}
                              />
                              <VmActionButton
                                vm={vm}
                                action="pause"
                                onAction={handleVmAction}
                                loading={actionLoading === vm.vmid}
                              />
                              <VmActionButton
                                vm={vm}
                                action="resume"
                                onAction={handleVmAction}
                                loading={actionLoading === vm.vmid}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
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

export default VmsPage;