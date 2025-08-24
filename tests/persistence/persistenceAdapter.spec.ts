import { describe, it, expect, vi, afterEach } from 'vitest';
import { onSaveClick, onLoadAtStartup, onClearStoredData, persistence } from '../../lib/persistence/persistenceAdapter';
import * as authStorage from '../../lib/persistence/authStorage';

vi.mock('../../lib/persistence/authStorage', () => ({
  saveProfile: vi.fn(),
  loadProfile: vi.fn(),
  clearProfile: vi.fn(),
  saveSecretPassword: vi.fn(),
  loadSecretPassword: vi.fn(),
  clearSecrets: vi.fn(),
  clearAll: vi.fn()
}));

describe('persistenceAdapter', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('onSaveClick', () => {
    it('should save profile and password when rememberPassword is true', async () => {
      (authStorage.saveProfile as any).mockResolvedValue(null);
      (authStorage.saveSecretPassword as any).mockResolvedValue(null);
      const result = await onSaveClick({ profile: { name: 'test' }, password: 'pass', rememberPassword: true });
      expect(result.ok).toBe(true);
      expect(authStorage.saveProfile).toHaveBeenCalledWith({ name: 'test' });
      expect(authStorage.saveSecretPassword).toHaveBeenCalledWith('pass');
    });

    it('should handle error on saveProfile', async () => {
      (authStorage.saveProfile as any).mockResolvedValue('ERROR');
      const result = await onSaveClick({ profile: { name: 'test' }, password: 'pass', rememberPassword: true });
      expect(result.ok).toBe(false);
      expect(result.code).toBe('ERROR');
    });

    it('should handle error on saveSecretPassword', async () => {
      (authStorage.saveProfile as any).mockResolvedValue(null);
      (authStorage.saveSecretPassword as any).mockResolvedValue('ERROR');
      const result = await onSaveClick({ profile: { name: 'test' }, password: 'pass', rememberPassword: true });
      expect(result.ok).toBe(false);
      expect(result.code).toBe('ERROR');
    });

    it('should save profile without password when rememberPassword is false', async () => {
      (authStorage.saveProfile as any).mockResolvedValue(null);
      (authStorage.saveSecretPassword as any).mockResolvedValue(null);
      const result = await onSaveClick({ profile: { name: 'test' }, password: 'pass', rememberPassword: false });
      expect(result.ok).toBe(true);
      expect(authStorage.saveProfile).toHaveBeenCalledWith({ name: 'test' });
      expect(authStorage.saveSecretPassword).not.toHaveBeenCalled();
    });
  });

  describe('onLoadAtStartup', () => {
    it('should load profile and password successfully', async () => {
      (authStorage.loadProfile as any).mockResolvedValue({ profile: { name: 'test' } });
      (authStorage.loadSecretPassword as any).mockResolvedValue({ password: 'pass' });
      const result = await onLoadAtStartup();
      expect(result.profile).toEqual({ name: 'test' });
      expect(result.hasStoredPassword).toBe(true);
      expect(result.password).toBe('pass');
    });

    it('should handle error on loadProfile', async () => {
      (authStorage.loadProfile as any).mockResolvedValue({ profile: null, error: 'ERROR' });
      (authStorage.loadSecretPassword as any).mockResolvedValue({ password: 'pass' });
      const result = await onLoadAtStartup();
      expect(result.profile).toBeNull();
      expect(result.error).toBe('ERROR');
    });

    it('should handle error on loadSecretPassword', async () => {
      (authStorage.loadProfile as any).mockResolvedValue({ profile: { name: 'test' } });
      (authStorage.loadSecretPassword as any).mockResolvedValue({ password: null, error: 'ERROR' });
      const result = await onLoadAtStartup();
      expect(result.profile).toEqual({ name: 'test' });
      expect(result.hasStoredPassword).toBe(false);
      expect(result.error).toBe('ERROR');
    });
  });

  describe('onClearStoredData', () => {
    it('should call clearAll', async () => {
      (authStorage.clearAll as any).mockResolvedValue(null);
      await onClearStoredData();
      expect(authStorage.clearAll).toHaveBeenCalled();
    });
  });

  describe('persistence object', () => {
    it('should expose functions', () => {
      expect(persistence).toHaveProperty('onSaveClick');
      expect(persistence).toHaveProperty('onLoadAtStartup');
      expect(persistence).toHaveProperty('onClearStoredData');
    });
  });
});