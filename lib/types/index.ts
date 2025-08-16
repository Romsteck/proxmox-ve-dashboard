/**
 * Comprehensive TypeScript types and Zod schemas for runtime validation
 */

import { z } from 'zod';
import { VALIDATION_RULES } from '../constants';

// Base schemas
export const NodeNameSchema = z.string()
  .min(1, 'Node name is required')
  .max(VALIDATION_RULES.NODE_NAME_MAX_LENGTH, `Node name must be less than ${VALIDATION_RULES.NODE_NAME_MAX_LENGTH} characters`);

export const StatusSchema = z.enum(['online', 'offline', 'unknown']);

export const PercentageSchema = z.number()
  .min(VALIDATION_RULES.METRIC_VALUE_MIN)
  .max(VALIDATION_RULES.METRIC_VALUE_MAX);

export const TimestampSchema = z.number().positive();

// Memory schema
export const MemorySchema = z.object({
  total: z.number().nonnegative(),
  used: z.number().nonnegative(),
  free: z.number().nonnegative(),
}).refine(
  (data) => data.used + data.free <= data.total,
  { message: 'Used + free memory cannot exceed total memory' }
);

// Storage schema
export const StorageSchema = z.object({
  total: z.number().nonnegative(),
  used: z.number().nonnegative(),
  avail: z.number().nonnegative(),
}).refine(
  (data) => data.used + data.avail <= data.total,
  { message: 'Used + available storage cannot exceed total storage' }
);

// Load average schema
export const LoadAverageSchema = z.tuple([
  z.number().nonnegative(),
  z.number().nonnegative(),
  z.number().nonnegative(),
]);

// Node summary schema
export const NodeSummarySchema = z.object({
  node: NodeNameSchema,
  status: StatusSchema.or(z.string()),
  uptime: z.number().nonnegative().optional(),
  loadavg: LoadAverageSchema.optional(),
  cpu: z.number().min(0).max(1).optional(),
  maxcpu: z.number().positive().optional(),
  memory: MemorySchema.optional(),
  storage: StorageSchema.optional(),
});

// Cluster summary schema
export const ClusterSummarySchema = z.object({
  nodes: z.array(NodeSummarySchema),
});

// Metric point schema
export const MetricPointSchema = z.object({
  t: TimestampSchema,
  cpu: z.number().min(0).max(1),
  memUsed: z.number().nonnegative(),
  memTotal: z.number().positive(),
});

// Metrics series schema
export const MetricsSeriesSchema = z.object({
  node: NodeNameSchema,
  series: z.array(MetricPointSchema),
});

// Event message schemas
export const HeartbeatEventSchema = z.object({
  type: z.literal('heartbeat'),
  ts: TimestampSchema,
});

export const StatusEventSchema = z.object({
  type: z.literal('status'),
  node: NodeNameSchema,
  status: NodeSummarySchema,
});

export const ErrorEventSchema = z.object({
  type: z.literal('error'),
  message: z.string().max(VALIDATION_RULES.ERROR_MESSAGE_MAX_LENGTH),
});

export const EventMessageSchema = z.discriminatedUnion('type', [
  HeartbeatEventSchema,
  StatusEventSchema,
  ErrorEventSchema,
]);

// Chart data schema
export const ChartDataPointSchema = z.object({
  time: z.string(),
  value: z.number(),
  name: z.string(),
});

export const ChartDataSchema = z.array(ChartDataPointSchema);

// Activity event schema
export const ActivityEventSchema = z.object({
  id: z.string(),
  type: z.enum(['vm_start', 'vm_stop', 'backup', 'migration', 'alert', 'maintenance']),
  message: z.string().min(1),
  timestamp: z.date(),
  node: NodeNameSchema.optional(),
  severity: z.enum(['info', 'warning', 'error', 'success']),
});

// API response schemas
export const ApiSuccessResponseSchema = z.object({
  ok: z.literal(true),
  data: z.unknown(),
});

export const ApiErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

export const ApiResponseSchema = z.discriminatedUnion('ok', [
  ApiSuccessResponseSchema,
  ApiErrorResponseSchema,
]);

// Cache entry schema
export const CacheEntrySchema = z.object({
  data: z.unknown(),
  timestamp: TimestampSchema,
  ttl: z.number().positive(),
});

// User preferences schema
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  refreshInterval: z.number().positive().default(5000),
  showNotifications: z.boolean().default(true),
  compactView: z.boolean().default(false),
});

// Performance metrics schema
export const PerformanceMetricsSchema = z.object({
  renderTime: z.number().nonnegative(),
  apiCallTime: z.number().nonnegative(),
  memoryUsage: z.number().nonnegative(),
  timestamp: TimestampSchema,
});

// Error context schema
export const ErrorContextSchema = z.object({
  operation: z.string(),
  timestamp: TimestampSchema,
  userAgent: z.string().optional(),
  url: z.string().optional(),
  userId: z.string().optional(),
  additionalData: z.record(z.string(), z.unknown()).optional(),
});

// TypeScript types derived from schemas
export type NodeName = z.infer<typeof NodeNameSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type Memory = z.infer<typeof MemorySchema>;
export type Storage = z.infer<typeof StorageSchema>;
export type LoadAverage = z.infer<typeof LoadAverageSchema>;
export type NodeSummary = z.infer<typeof NodeSummarySchema>;
export type ClusterSummary = z.infer<typeof ClusterSummarySchema>;
export type MetricPoint = z.infer<typeof MetricPointSchema>;
export type MetricsSeries = z.infer<typeof MetricsSeriesSchema>;
export type EventMessage = z.infer<typeof EventMessageSchema>;
export type HeartbeatEvent = z.infer<typeof HeartbeatEventSchema>;
export type StatusEvent = z.infer<typeof StatusEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>;
export type ChartData = z.infer<typeof ChartDataSchema>;
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type ApiSuccessResponse = z.infer<typeof ApiSuccessResponseSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type CacheEntry = z.infer<typeof CacheEntrySchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;
export type ErrorContext = z.infer<typeof ErrorContextSchema>;

// Validation helper functions
export function validateNodeSummary(data: unknown): NodeSummary {
  return NodeSummarySchema.parse(data);
}

export function validateClusterSummary(data: unknown): ClusterSummary {
  return ClusterSummarySchema.parse(data);
}

export function validateEventMessage(data: unknown): EventMessage {
  return EventMessageSchema.parse(data);
}

export function validateApiResponse(data: unknown): ApiResponse {
  return ApiResponseSchema.parse(data);
}

export function validateUserPreferences(data: unknown): UserPreferences {
  return UserPreferencesSchema.parse(data);
}

// Safe validation functions that return results with error handling
export function safeValidateNodeSummary(data: unknown): { success: true; data: NodeSummary } | { success: false; error: string } {
  try {
    const validated = NodeSummarySchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
  }
}

export function safeValidateClusterSummary(data: unknown): { success: true; data: ClusterSummary } | { success: false; error: string } {
  try {
    const validated = ClusterSummarySchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
  }
}

export function safeValidateEventMessage(data: unknown): { success: true; data: EventMessage } | { success: false; error: string } {
  try {
    const validated = EventMessageSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
  }
}

export function safeValidateApiResponse(data: unknown): { success: true; data: ApiResponse } | { success: false; error: string } {
  try {
    const validated = ApiResponseSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
  }
}

// Type guards
export function isNodeSummary(data: unknown): data is NodeSummary {
  return NodeSummarySchema.safeParse(data).success;
}

export function isClusterSummary(data: unknown): data is ClusterSummary {
  return ClusterSummarySchema.safeParse(data).success;
}

export function isEventMessage(data: unknown): data is EventMessage {
  return EventMessageSchema.safeParse(data).success;
}

export function isApiSuccessResponse(data: unknown): data is ApiSuccessResponse {
  return ApiSuccessResponseSchema.safeParse(data).success;
}

export function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return ApiErrorResponseSchema.safeParse(data).success;
}

// VM and Container schemas
export const VmStatusSchema = z.enum(['running', 'stopped', 'paused', 'suspended', 'template']);

export const VmTypeSchema = z.enum(['qemu', 'lxc']);

export const VmResourceSchema = z.object({
  vmid: z.number().positive(),
  name: z.string().optional(),
  type: VmTypeSchema,
  status: VmStatusSchema,
  node: NodeNameSchema,
  cpu: z.number().min(0).max(1).optional(),
  maxcpu: z.number().positive().optional(),
  memory: z.object({
    used: z.number().nonnegative().optional(),
    max: z.number().positive().optional(),
  }).optional(),
  disk: z.object({
    used: z.number().nonnegative().optional(),
    max: z.number().positive().optional(),
  }).optional(),
  uptime: z.number().nonnegative().optional(),
  template: z.boolean().optional(),
  tags: z.string().optional(),
});

export const VmListSchema = z.object({
  vms: z.array(VmResourceSchema),
});

// Alert schemas
export const AlertSeveritySchema = z.enum(['info', 'warning', 'error', 'critical']);

export const AlertTypeSchema = z.enum(['cpu', 'memory', 'storage', 'network', 'custom']);

export const AlertThresholdSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: AlertTypeSchema,
  metric: z.string(),
  operator: z.enum(['>', '<', '>=', '<=', '==', '!=']),
  value: z.number(),
  severity: AlertSeveritySchema,
  enabled: z.boolean().default(true),
  node: NodeNameSchema.optional(),
  vmid: z.number().positive().optional(),
});

export const AlertSchema = z.object({
  id: z.string(),
  thresholdId: z.string(),
  message: z.string(),
  severity: AlertSeveritySchema,
  timestamp: z.date(),
  node: NodeNameSchema.optional(),
  vmid: z.number().positive().optional(),
  acknowledged: z.boolean().default(false),
  acknowledgedBy: z.string().optional(),
  acknowledgedAt: z.date().optional(),
});

export const AlertConfigSchema = z.object({
  thresholds: z.array(AlertThresholdSchema),
  globalEnabled: z.boolean().default(true),
  notificationChannels: z.object({
    toast: z.boolean().default(true),
    email: z.boolean().default(false),
    webhook: z.boolean().default(false),
  }),
});

// Historical metrics schemas
export const TimeRangeSchema = z.enum(['1h', '6h', '24h', '7d', '30d']);

export const HistoricalMetricPointSchema = z.object({
  timestamp: TimestampSchema,
  cpu: z.number().min(0).max(1).optional(),
  memory: z.object({
    used: z.number().nonnegative(),
    total: z.number().positive(),
  }).optional(),
  storage: z.object({
    used: z.number().nonnegative(),
    total: z.number().positive(),
  }).optional(),
  network: z.object({
    rx: z.number().nonnegative(),
    tx: z.number().nonnegative(),
  }).optional(),
});

export const HistoricalMetricsSchema = z.object({
  node: NodeNameSchema,
  vmid: z.number().positive().optional(),
  timeRange: TimeRangeSchema,
  data: z.array(HistoricalMetricPointSchema),
});

// Settings schemas
export const ProxmoxConnectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  url: z.string().url(),
  username: z.string().min(1),
  tokenId: z.string().min(1),
  tokenSecret: z.string().min(1),
  insecureTLS: z.boolean().default(false),
  active: z.boolean().default(false),
});

export const AppSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.enum(['en', 'fr', 'de', 'es']).default('en'),
  refreshInterval: z.number().positive().default(5000),
  autoRefresh: z.boolean().default(true),
  showNotifications: z.boolean().default(true),
  compactView: z.boolean().default(false),
  defaultTimeRange: TimeRangeSchema.default('24h'),
  maxHistoryPoints: z.number().positive().default(100),
  connections: z.array(ProxmoxConnectionSchema).default([]),
  alerts: AlertConfigSchema.default({
    thresholds: [],
    globalEnabled: true,
    notificationChannels: {
      toast: true,
      email: false,
      webhook: false,
    },
  }),
});

// Monitoring schemas
export const LogEntrySchema = z.object({
  timestamp: TimestampSchema,
  level: z.enum(['debug', 'info', 'warning', 'error']),
  source: z.string(),
  message: z.string(),
  node: NodeNameSchema.optional(),
  vmid: z.number().positive().optional(),
});

export const BackupJobSchema = z.object({
  id: z.string(),
  vmid: z.number().positive(),
  node: NodeNameSchema,
  type: z.enum(['vzdump', 'snapshot']),
  status: z.enum(['running', 'completed', 'failed', 'scheduled']),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  size: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const ServiceStatusSchema = z.object({
  name: z.string(),
  status: z.enum(['active', 'inactive', 'failed', 'unknown']),
  enabled: z.boolean(),
  description: z.string().optional(),
});

// TypeScript types derived from new schemas
export type VmStatus = z.infer<typeof VmStatusSchema>;
export type VmType = z.infer<typeof VmTypeSchema>;
export type VmResource = z.infer<typeof VmResourceSchema>;
export type VmList = z.infer<typeof VmListSchema>;
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;
export type AlertType = z.infer<typeof AlertTypeSchema>;
export type AlertThreshold = z.infer<typeof AlertThresholdSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type AlertConfig = z.infer<typeof AlertConfigSchema>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;
export type HistoricalMetricPoint = z.infer<typeof HistoricalMetricPointSchema>;
export type HistoricalMetrics = z.infer<typeof HistoricalMetricsSchema>;
export type ProxmoxConnection = z.infer<typeof ProxmoxConnectionSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type BackupJob = z.infer<typeof BackupJobSchema>;
export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;

// Validation functions for new schemas
export function validateVmResource(data: unknown): VmResource {
  return VmResourceSchema.parse(data);
}

export function validateVmList(data: unknown): VmList {
  return VmListSchema.parse(data);
}

export function validateAlert(data: unknown): Alert {
  return AlertSchema.parse(data);
}

export function validateAppSettings(data: unknown): AppSettings {
  return AppSettingsSchema.parse(data);
}

export function validateHistoricalMetrics(data: unknown): HistoricalMetrics {
  return HistoricalMetricsSchema.parse(data);
}

// Safe validation functions
export function safeValidateVmList(data: unknown): { success: true; data: VmList } | { success: false; error: string } {
  try {
    const validated = VmListSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
  }
}

export function safeValidateAppSettings(data: unknown): { success: true; data: AppSettings } | { success: false; error: string } {
  try {
    const validated = AppSettingsSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
  }
}

// Type guards for new schemas
export function isVmResource(data: unknown): data is VmResource {
  return VmResourceSchema.safeParse(data).success;
}

export function isAlert(data: unknown): data is Alert {
  return AlertSchema.safeParse(data).success;
}

export function isAppSettings(data: unknown): data is AppSettings {
  return AppSettingsSchema.safeParse(data).success;
}