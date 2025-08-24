import { idbGet, idbPut, idbDel, idbClear } from './indexedDb';
import { PersistErrorCode } from './types';

const PROFILE_KEY = 'profile';
const SECRET_PASSWORD_KEY = 'secret_password';

export async function saveProfile(profile: any): Promise<PersistErrorCode | null> {
  try {
    await idbPut(PROFILE_KEY, profile);
    return null;
  } catch (e) {
    return PersistErrorCode.UNKNOWN_ERROR;
  }
}

export async function loadProfile(): Promise<{ profile: any | null; error?: PersistErrorCode }> {
  try {
    const profile = await idbGet<any>(PROFILE_KEY);
    if (profile === undefined) {
      return { profile: null };
    }
    return { profile };
  } catch (e) {
    return { profile: null, error: PersistErrorCode.UNKNOWN_ERROR };
  }
}

export async function clearProfile(): Promise<PersistErrorCode | null> {
  try {
    await idbDel(PROFILE_KEY);
    return null;
  } catch (e) {
    return PersistErrorCode.UNKNOWN_ERROR;
  }
}

export async function saveSecretPassword(password: string): Promise<PersistErrorCode | null> {
  try {
    await idbPut(SECRET_PASSWORD_KEY, password);
    return null;
  } catch (e) {
    return PersistErrorCode.UNKNOWN_ERROR;
  }
}

export async function loadSecretPassword(): Promise<{ password: string | null; error?: PersistErrorCode }> {
  try {
    const password = await idbGet<string>(SECRET_PASSWORD_KEY);
    if (password === undefined) {
      return { password: null };
    }
    return { password };
  } catch (e) {
    return { password: null, error: PersistErrorCode.UNKNOWN_ERROR };
  }
}

export async function clearSecrets(): Promise<PersistErrorCode | null> {
  try {
    await idbDel(SECRET_PASSWORD_KEY);
    return null;
  } catch (e) {
    return PersistErrorCode.UNKNOWN_ERROR;
  }
}

export async function clearAll(): Promise<PersistErrorCode | null> {
  try {
    await Promise.all([idbDel(PROFILE_KEY), idbDel(SECRET_PASSWORD_KEY)]);
    return null;
  } catch (e) {
    return PersistErrorCode.UNKNOWN_ERROR;
  }
}