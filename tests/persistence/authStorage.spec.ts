import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveProfile, loadProfile, clearProfile, saveSecretPassword, loadSecretPassword, clearSecrets, clearAll } from '../../lib/persistence/authStorage';
import { idbGet, idbPut, idbDel, idbClear } from '../../lib/persistence/indexedDb';

vi.mock('../../lib/persistence/indexedDb', () => ({
  idbGet: vi.fn(),
  idbPut: vi.fn(),
  idbDel: vi.fn(),
  idbClear: vi.fn()
}));

describe('authStorage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should save and load profile successfully', async () => {
    const profileData = { name: 'Test' };
    (idbPut as any).mockResolvedValue(undefined);
    (idbGet as any).mockResolvedValue(profileData);

    const error = await saveProfile(profileData);
    expect(error).toBeNull();

    const result = await loadProfile();
    expect(result.profile).toEqual(profileData);
  });

  it('should handle error on saveProfile', async () => {
    (idbPut as any).mockRejectedValue(new Error('fail'));
    const error = await saveProfile({ name: 'fail' });
    expect(error).toBe('UNKNOWN_ERROR');
  });

  it('should handle error on loadProfile', async () => {
    (idbGet as any).mockRejectedValue(new Error('fail'));
    const result = await loadProfile();
    expect(result.error).toBe('UNKNOWN_ERROR');
  });

  it('should clear profile', async () => {
    (idbDel as any).mockResolvedValue(undefined);
    const error = await clearProfile();
    expect(error).toBeNull();
  });

  it('should handle error on clearProfile', async () => {
    (idbDel as any).mockRejectedValue(new Error('fail'));
    const error = await clearProfile();
    expect(error).toBe('UNKNOWN_ERROR');
  });

  it('should save and load secret password', async () => {
    const password = 'mypassword';
    (idbPut as any).mockResolvedValue(undefined);
    (idbGet as any).mockResolvedValue(password);

    const saveError = await saveSecretPassword(password);
    expect(saveError).toBeNull();

    const { password: loadedPassword } = await loadSecretPassword();
    expect(loadedPassword).toEqual(password);
  });

  it('should handle error on saveSecretPassword', async () => {
    (idbPut as any).mockRejectedValue(new Error('fail'));
    const error = await saveSecretPassword('fail');
    expect(error).toBe('UNKNOWN_ERROR');
  });

  it('should handle error on loadSecretPassword', async () => {
    (idbGet as any).mockRejectedValue(new Error('fail'));
    const result = await loadSecretPassword();
    expect(result.error).toBe('UNKNOWN_ERROR');
  });

  it('should clear secrets', async () => {
    (idbDel as any).mockResolvedValue(undefined);
    const error = await clearSecrets();
    expect(error).toBeNull();
  });

  it('should handle error on clearSecrets', async () => {
    (idbDel as any).mockRejectedValue(new Error('fail'));
    const error = await clearSecrets();
    expect(error).toBe('UNKNOWN_ERROR');
  });

  it('should clear all data', async () => {
    (idbDel as any).mockResolvedValue(undefined);
    const error = await clearAll();
    expect(error).toBeNull();
  });

  it('should handle error on clearAll', async () => {
    (idbDel as any).mockRejectedValue(new Error('fail'));
    const error = await clearAll();
    expect(error).toBe('UNKNOWN_ERROR');
  });
});