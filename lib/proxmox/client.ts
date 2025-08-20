import type { IncomingHttpHeaders } from "http";
import { env } from "../../env/index";
import type {
  NodeSummary,
  ClusterSummary,
  MetricPoint,
  MetricsSeries,
  EventMessage,
  VmResource,
  VmList,
  TimeRange,
  HistoricalMetrics,
  LogEntry,
  BackupJob,
  ServiceStatus,
  Alert,
} from "../types";

/**
 * VM Action types for controlling VMs and containers
 */
export type VmAction = 'start' | 'stop' | 'restart' | 'pause' | 'resume' | 'shutdown' | 'reset';

/**
 * Enhanced transport-agnostic client interface with new features
 */
export interface ProxmoxClient {
  getClusterSummary(signal?: AbortSignal): Promise<ClusterSummary>;
  getNodeMetrics(node: string, rangeSeconds: number, signal?: AbortSignal): Promise<MetricsSeries>;
  streamEvents(init?: { headers?: IncomingHttpHeaders }): AsyncIterable<EventMessage>;
  getVmList(signal?: AbortSignal): Promise<VmList>;
  getVmDetails(node: string, vmid: number, signal?: AbortSignal): Promise<VmResource>;
  performVmAction(node: string, vmid: number, action: VmAction, signal?: AbortSignal): Promise<{ success: boolean; message?: string }>;
  getHistoricalMetrics(
    node: string,
    timeRange: TimeRange,
    vmid?: number,
    signal?: AbortSignal,
  ): Promise<HistoricalMetrics>;
  getSystemLogs(
    node: string,
    limit?: number,
    since?: Date,
    signal?: AbortSignal,
  ): Promise<LogEntry[]>;
  getBackupJobs(node?: string, signal?: AbortSignal): Promise<BackupJob[]>;
  getServiceStatus(node: string, signal?: AbortSignal): Promise<ServiceStatus[]>;
  getActiveAlerts(signal?: AbortSignal): Promise<Alert[]>;
  acknowledgeAlert(alertId: string, signal?: AbortSignal): Promise<{ success: boolean }>;
}

/**
 * Factory: chooses adapter based on environment.
 * - If ENABLE_MOCK=true, use the mock adapter.
 * - Else use HTTPS adapter with token auth.
 */
export function createProxmoxClient(): ProxmoxClient {
  const e = env.get();

  if (e.ENABLE_MOCK) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createMockClient } = require("./adapters/mock") as typeof import("./adapters/mock");
    return createMockClient();
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHttpsClient } = require("./adapters/https") as typeof import("./adapters/https");
  return createHttpsClient({
    baseUrl: e.PROXMOX_BASE_URL,
    tokenId: e.PROXMOX_API_TOKEN_ID,
    tokenSecret: e.PROXMOX_API_TOKEN_SECRET,
    insecureTLS: e.PROXMOX_INSECURE_TLS,
    cacheTtlMs: e.SERVER_CACHE_TTL_MS,
    pollIntervalMs: e.POLL_INTERVAL_MS,
  });
}

/**
 * Convenience helpers for existing functionality
 */
export async function getClusterSummary(signal?: AbortSignal) {
  const client = createProxmoxClient();
  return client.getClusterSummary(signal);
}

export async function getNodeMetrics(node: string, rangeSeconds: number, signal?: AbortSignal) {
  const client = createProxmoxClient();
  return client.getNodeMetrics(node, rangeSeconds, signal);
}

export function eventsStream(init?: { headers?: IncomingHttpHeaders }) {
  const client = createProxmoxClient();
  return client.streamEvents(init);
}

/**
 * Convenience helpers for new VM/Container functionality
 */
export async function getVmList(signal?: AbortSignal) {
  const client = createProxmoxClient();
  return client.getVmList(signal);
}

export async function getVmDetails(node: string, vmid: number, signal?: AbortSignal) {
  const client = createProxmoxClient();
  return client.getVmDetails(node, vmid, signal);
}

export async function performVmAction(node: string, vmid: number, action: VmAction, signal?: AbortSignal) {
  const client = createProxmoxClient();
  return client.performVmAction(node, vmid, action, signal);
}

/**
 * Convenience helpers for historical metrics
 */
export async function getHistoricalMetrics(
  node: string,
  timeRange: TimeRange,
  vmid?: number,
  signal?: AbortSignal
) {
  const client = createProxmoxClient();
  return client.getHistoricalMetrics(node, timeRange, vmid, signal);
}

/**
 * Convenience helpers for monitoring features
 */
export async function getSystemLogs(
  node: string,
  limit?: number,
  since?: Date,
  signal?: AbortSignal
) {
  const client = createProxmoxClient();
  return client.getSystemLogs(node, limit, since, signal);
}

export async function getBackupJobs(node?: string, signal?: AbortSignal) {
  const client = createProxmoxClient();
  return client.getBackupJobs(node, signal);
}

export async function getServiceStatus(node: string, signal?: AbortSignal) {
  const client = createProxmoxClient();
  return client.getServiceStatus(node, signal);
}

/**
 * Convenience helpers for alert management
 */
export async function getActiveAlerts(signal?: AbortSignal) {
  const client = createProxmoxClient();
  return client.getActiveAlerts(signal);
}

export async function acknowledgeAlert(alertId: string, signal?: AbortSignal) {
  const client = createProxmoxClient();
  return client.acknowledgeAlert(alertId, signal);
}