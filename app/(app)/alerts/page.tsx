"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { showToast } from "@/components/ui/Toast";
import { SectionErrorBoundary } from "@/components/ErrorBoundary";
import { usePerformanceMonitor } from "@/lib/utils/performance";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Alert, AlertThreshold, AlertSeverity, AlertConfig } from "@/lib/types";
import {
  Bell,
  BellOff,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  Plus,
  Settings,
  RefreshCw,
  Search,
  Clock,
  User,
} from "lucide-react";

// Alert Badge Component
interface AlertBadgeProps {
  severity: AlertSeverity;
}

const AlertBadge: React.FC<AlertBadgeProps> = ({ severity }) => {
  const getBadgeColor = () => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getBadgeIcon = () => {
    switch (severity) {
      case 'critical': return AlertTriangle;
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      default: return Info;
    }
  };

  const IconComponent = getBadgeIcon();

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getBadgeColor()}`}>
      <Icon icon={IconComponent} size="xs" />
      {severity.toUpperCase()}
    </span>
  );
};

// Alert Threshold Form Component
interface AlertThresholdFormProps {
  threshold?: AlertThreshold;
  onSave: (threshold: AlertThreshold) => void;
  onCancel: () => void;
}

const AlertThresholdForm: React.FC<AlertThresholdFormProps> = ({ threshold, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<AlertThreshold>>({
    id: threshold?.id || '',
    name: threshold?.name || '',
    type: threshold?.type || 'cpu',
    metric: threshold?.metric || 'usage',
    operator: threshold?.operator || '>',
    value: threshold?.value || 80,
    severity: threshold?.severity || 'warning',
    enabled: threshold?.enabled ?? true,
    node: threshold?.node || '',
    vmid: threshold?.vmid || undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.value === undefined) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const newThreshold: AlertThreshold = {
      id: formData.id || `threshold-${Date.now()}`,
      name: formData.name,
      type: formData.type!,
      metric: formData.metric!,
      operator: formData.operator!,
      value: formData.value,
      severity: formData.severity!,
      enabled: formData.enabled!,
      node: formData.node || undefined,
      vmid: formData.vmid || undefined,
    };

    onSave(newThreshold);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{threshold ? 'Edit Alert Threshold' : 'Create Alert Threshold'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                aria-label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                placeholder="High CPU Usage"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                aria-label="Metric"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as AlertThreshold['type'] })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="cpu">CPU</option>
                <option value="memory">Memory</option>
                <option value="storage">Storage</option>
                <option value="network">Network</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Condition
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.operator}
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value as AlertThreshold['operator'] })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value=">">Greater than</option>
                  <option value="<">Less than</option>
                  <option value=">=">Greater or equal</option>
                  <option value="<=">Less or equal</option>
                  <option value="==">Equal to</option>
                  <option value="!=">Not equal to</option>
                </select>
                <input
                  type="number"
                  aria-label="Value"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="80"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Severity
              </label>
              <select
                aria-label="Severity"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as AlertSeverity })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable this threshold
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {threshold ? 'Update' : 'Create'} Threshold
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const AlertsPage: React.FC = () => {
  const performanceMetrics = usePerformanceMonitor('AlertsPage');
  
  // State management
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertConfig, setAlertConfig] = useLocalStorage('alertConfig', {
    defaultValue: {
      thresholds: [],
      globalEnabled: true,
      notificationChannels: {
        toast: true,
        email: false,
        webhook: false,
      },
    } as AlertConfig,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [showThresholdForm, setShowThresholdForm] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<AlertThreshold | undefined>();

  // Fetch alerts
  const fetchAlerts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);
      const response = await fetch('/api/proxmox/alerts');
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      showToast.error('Failed to load alerts');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchAlerts(true); // Show loading on initial fetch
    const interval = setInterval(() => fetchAlerts(false), 30000); // No loading for background refresh
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Acknowledge alert
  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const response = await fetch(`/api/proxmox/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }
      
      showToast.success('Alert acknowledged');
      await fetchAlerts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to acknowledge alert';
      showToast.error(errorMessage);
    }
  }, [fetchAlerts]);

  // Save threshold
  const handleSaveThreshold = useCallback((threshold: AlertThreshold) => {
    const updatedThresholds = editingThreshold
      ? alertConfig.thresholds.map(t => t.id === threshold.id ? threshold : t)
      : [...alertConfig.thresholds, threshold];
    
    setAlertConfig({
      ...alertConfig,
      thresholds: updatedThresholds,
    });
    
    setShowThresholdForm(false);
    setEditingThreshold(undefined);
    showToast.success(`Threshold ${editingThreshold ? 'updated' : 'created'} successfully`);
  }, [alertConfig, setAlertConfig, editingThreshold]);

  // Delete threshold
  const handleDeleteThreshold = useCallback((thresholdId: string) => {
    const updatedThresholds = alertConfig.thresholds.filter(t => t.id !== thresholdId);
    setAlertConfig({
      ...alertConfig,
      thresholds: updatedThresholds,
    });
    showToast.success('Threshold deleted successfully');
  }, [alertConfig, setAlertConfig]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = !searchTerm || 
        alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.node?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      const matchesAcknowledged = showAcknowledged || !alert.acknowledged;
      
      return matchesSearch && matchesSeverity && matchesAcknowledged;
    });
  }, [alerts, searchTerm, severityFilter, showAcknowledged]);

  // Statistics
  const stats = useMemo(() => {
    const active = alerts.filter(a => !a.acknowledged);
    return {
      total: alerts.length,
      active: active.length,
      critical: active.filter(a => a.severity === 'critical').length,
      warning: active.filter(a => a.severity === 'warning').length,
      thresholds: alertConfig.thresholds.length,
      enabledThresholds: alertConfig.thresholds.filter(t => t.enabled).length,
    };
  }, [alerts, alertConfig.thresholds]);

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
        {/* Header */}
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Alerts & Monitoring
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monitor system alerts and configure thresholds
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => fetchAlerts(true)} loading={isLoading}>
              <Icon icon={RefreshCw} size="sm" className="mr-2" />
              Refresh
            </Button>
            <Button 
              size="sm" 
              onClick={() => {
                setEditingThreshold(undefined);
                setShowThresholdForm(true);
              }}
            >
              <Icon icon={Plus} size="sm" className="mr-2" />
              Add Threshold
            </Button>
          </div>
        </header>

        {/* Statistics Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Bell} size="sm" className="text-blue-600 dark:text-blue-400" />
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
                <Icon icon={AlertTriangle} size="sm" className="text-orange-600 dark:text-orange-400" />
                <CardTitle>Active</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.active}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={AlertCircle} size="sm" className="text-red-600 dark:text-red-400" />
                <CardTitle>Critical</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.critical}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={AlertTriangle} size="sm" className="text-yellow-600 dark:text-yellow-400" />
                <CardTitle>Warning</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.warning}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Settings} size="sm" className="text-purple-600 dark:text-purple-400" />
                <CardTitle>Thresholds</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.thresholds}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={CheckCircle} size="sm" className="text-green-600 dark:text-green-400" />
                <CardTitle>Enabled</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.enabledThresholds}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Threshold Form */}
        {showThresholdForm && (
          <SectionErrorBoundary>
            <AlertThresholdForm
              threshold={editingThreshold}
              onSave={handleSaveThreshold}
              onCancel={() => {
                setShowThresholdForm(false);
                setEditingThreshold(undefined);
              }}
            />
          </SectionErrorBoundary>
        )}

        {/* Filters and Search */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Icon icon={Search} size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'all')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showAcknowledged}
                onChange={(e) => setShowAcknowledged(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show acknowledged
            </label>
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Active Alerts */}
          <SectionErrorBoundary>
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts ({filteredAlerts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                      Loading alerts...
                    </div>
                  ) : filteredAlerts.length === 0 ? (
                    <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                      No alerts found.
                    </div>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        role="listitem"
                        className={`rounded-lg border p-3 ${
                          alert.acknowledged
                            ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertBadge severity={alert.severity} />
                              {alert.node && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {alert.node}
                                </span>
                              )}
                              {alert.vmid && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  VM {alert.vmid}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                              {alert.message}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Icon icon={Clock} size="xs" />
                                {formatTimeAgo(alert.timestamp)}
                              </div>
                              {alert.acknowledged && alert.acknowledgedBy && (
                                <div className="flex items-center gap-1">
                                  <Icon icon={User} size="xs" />
                                  Acked by {alert.acknowledgedBy}
                                </div>
                              )}
                            </div>
                          </div>
                          {!alert.acknowledged && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                            >
                              <Icon icon={CheckCircle} size="sm" className="mr-1" />
                              Ack
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </SectionErrorBoundary>

          {/* Alert Thresholds */}
          <SectionErrorBoundary>
            <Card>
              <CardHeader>
                <CardTitle>Alert Thresholds ({alertConfig.thresholds.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {alertConfig.thresholds.length === 0 ? (
                    <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                      No thresholds configured.
                    </div>
                  ) : (
                    alertConfig.thresholds.map((threshold) => (
                      <div
                        key={threshold.id}
                        role="listitem"
                        className={`rounded-lg border p-3 ${
                          threshold.enabled
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50'
                            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {threshold.name}
                              </span>
                              <AlertBadge severity={threshold.severity} />
                              {!threshold.enabled && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                  <Icon icon={BellOff} size="xs" />
                                  Disabled
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {threshold.type} {threshold.metric} {threshold.operator} {threshold.value}
                              {threshold.node && ` on ${threshold.node}`}
                              {threshold.vmid && ` (VM ${threshold.vmid})`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingThreshold(threshold);
                                setShowThresholdForm(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDeleteThreshold(threshold.id)}
                            >
                              <Icon icon={X} size="sm" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </SectionErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;