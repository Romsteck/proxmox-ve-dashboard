export enum PersistErrorCode {
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  TTL_EXPIRED = 'TTL_EXPIRED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface Policies {
  policyAllowPasswordRemember: boolean;
  defaultTtlDays: number;
  defaultSecretTtlDays: number;
}

export interface AdapterLoadResult<T> {
  data: T | null;
  error?: PersistErrorCode;
  message?: string;
}