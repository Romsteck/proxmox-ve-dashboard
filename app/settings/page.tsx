"use client";

import React, { useState, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { showToast } from "@/components/ui/Toast";
import { SectionErrorBoundary } from "@/components/ErrorBoundary";
import { usePerformanceMonitor } from "@/lib/utils/performance";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { AppSettings, TimeRange } from "@/lib/types";
import {
  Settings,
  Monitor,
  Bell,
  Palette,
  Globe,
  Clock,
  RefreshCw,
  Save,
  RotateCcw,
  Download,
  Upload,
  Server,
  Mail,
  Webhook,
} from "lucide-react";

const SettingsPage: React.FC = () => {
  const performanceMetrics = usePerformanceMonitor('SettingsPage');
  
  // Settings state
  const [settings, setSettings] = useLocalStorage('appSettings', {
    defaultValue: {
      theme: 'system',
      language: 'en',
      refreshInterval: 5000,
      autoRefresh: true,
      showNotifications: true,
      compactView: false,
      defaultTimeRange: '24h',
      maxHistoryPoints: 100,
      connections: [],
      alerts: {
        thresholds: [],
        globalEnabled: true,
        notificationChannels: {
          toast: true,
          email: false,
          webhook: false,
        },
      },
    } as AppSettings,
  });

  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Handle form changes
  const handleChange = useCallback((key: keyof AppSettings, value: any) => {
    setTempSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(settings));
      return newSettings;
    });
  }, [settings]);

  // Handle nested changes (for alerts)
  const handleNestedChange = useCallback((path: string[], value: any) => {
    setTempSettings(prev => {
      const newSettings = { ...prev };
      let current: any = newSettings;
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      
      setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(settings));
      return newSettings;
    });
  }, [settings]);

  // Save settings
  const handleSave = useCallback(() => {
    setSettings(tempSettings);
    setHasChanges(false);
    showToast.success('Settings saved successfully');
  }, [tempSettings, setSettings]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    const defaultSettings: AppSettings = {
      theme: 'system',
      language: 'en',
      refreshInterval: 5000,
      autoRefresh: true,
      showNotifications: true,
      compactView: false,
      defaultTimeRange: '24h',
      maxHistoryPoints: 100,
      connections: [],
      alerts: {
        thresholds: [],
        globalEnabled: true,
        notificationChannels: {
          toast: true,
          email: false,
          webhook: false,
        },
      },
    };
    
    setTempSettings(defaultSettings);
    setHasChanges(true);
  }, []);

  // Export settings
  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proxmox-dashboard-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast.success('Settings exported successfully');
  }, [settings]);

  // Import settings
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setTempSettings(importedSettings);
        setHasChanges(true);
        showToast.success('Settings imported successfully');
      } catch (error) {
        showToast.error('Failed to import settings: Invalid file format');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  }, []);

  return (
    <div className="min-h-screen w-full p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Settings
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure your dashboard preferences and connections
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button variant="secondary" size="sm" onClick={() => setTempSettings(settings)}>
                <Icon icon={RotateCcw} size="sm" className="mr-2" />
                Discard
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={!hasChanges}
            >
              <Icon icon={Save} size="sm" className="mr-2" />
              Save Changes
            </Button>
          </div>
        </header>

        {/* General Settings */}
        <SectionErrorBoundary>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Settings} size="sm" className="text-blue-600 dark:text-blue-400" />
                <CardTitle>General</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Icon icon={Palette} size="sm" className="inline mr-2" />
                    Theme
                  </label>
                  <select
                    value={tempSettings.theme}
                    onChange={(e) => handleChange('theme', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Icon icon={Globe} size="sm" className="inline mr-2" />
                    Language
                  </label>
                  <select
                    value={tempSettings.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Icon icon={RefreshCw} size="sm" className="inline mr-2" />
                    Refresh Interval (ms)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="60000"
                    step="1000"
                    value={tempSettings.refreshInterval}
                    onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Icon icon={Clock} size="sm" className="inline mr-2" />
                    Default Time Range
                  </label>
                  <select
                    value={tempSettings.defaultTimeRange}
                    onChange={(e) => handleChange('defaultTimeRange', e.target.value as TimeRange)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="1h">1 Hour</option>
                    <option value="6h">6 Hours</option>
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={tempSettings.autoRefresh}
                    onChange={(e) => handleChange('autoRefresh', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable automatic refresh
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={tempSettings.showNotifications}
                    onChange={(e) => handleChange('showNotifications', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show notifications
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={tempSettings.compactView}
                    onChange={(e) => handleChange('compactView', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Use compact view
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>
        </SectionErrorBoundary>

        {/* Monitoring Settings */}
        <SectionErrorBoundary>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Monitor} size="sm" className="text-green-600 dark:text-green-400" />
                <CardTitle>Monitoring</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum History Points
                </label>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  step="50"
                  value={tempSettings.maxHistoryPoints}
                  onChange={(e) => handleChange('maxHistoryPoints', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Maximum number of data points to store for historical charts
                </p>
              </div>
            </CardContent>
          </Card>
        </SectionErrorBoundary>

        {/* Alert Settings */}
        <SectionErrorBoundary>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Bell} size="sm" className="text-orange-600 dark:text-orange-400" />
                <CardTitle>Alerts & Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={tempSettings.alerts.globalEnabled}
                  onChange={(e) => handleNestedChange(['alerts', 'globalEnabled'], e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable global alerts
                </span>
              </label>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notification Channels
                </h4>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={tempSettings.alerts.notificationChannels.toast}
                    onChange={(e) => handleNestedChange(['alerts', 'notificationChannels', 'toast'], e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Icon icon={Bell} size="sm" className="text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Toast notifications
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={tempSettings.alerts.notificationChannels.email}
                    onChange={(e) => handleNestedChange(['alerts', 'notificationChannels', 'email'], e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Icon icon={Mail} size="sm" className="text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Email notifications
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={tempSettings.alerts.notificationChannels.webhook}
                    onChange={(e) => handleNestedChange(['alerts', 'notificationChannels', 'webhook'], e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Icon icon={Webhook} size="sm" className="text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Webhook notifications
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>
        </SectionErrorBoundary>

        {/* Import/Export Settings */}
        <SectionErrorBoundary>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon={Server} size="sm" className="text-purple-600 dark:text-purple-400" />
                <CardTitle>Data Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={handleExport}>
                  <Icon icon={Download} size="sm" className="mr-2" />
                  Export Settings
                </Button>
                
                <label className="inline-flex cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <div className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Icon icon={Upload} size="sm" />
                    Import Settings
                  </div>
                </label>

                <Button variant="secondary" onClick={handleReset}>
                  <Icon icon={RotateCcw} size="sm" className="mr-2" />
                  Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </SectionErrorBoundary>

        {/* Save Changes Bar */}
        {hasChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <Card className="shadow-lg">
              <CardContent className="flex items-center gap-3 py-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  You have unsaved changes
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setTempSettings(settings)}>
                    Discard
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;