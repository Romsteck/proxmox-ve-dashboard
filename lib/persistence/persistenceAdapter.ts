import { saveProfile, loadProfile, clearProfile, saveSecretPassword, loadSecretPassword, clearSecrets, clearAll } from './authStorage';

export async function onSaveClick(formValues: { profile: any; password?: string; rememberPassword?: boolean }): Promise<{ ok: boolean; code?: PersistErrorCode }> {
  const profileError = await saveProfile(formValues.profile);
  if (profileError) {
    return { ok: false, code: profileError };
  }
  if (formValues.rememberPassword && formValues.password) {
    const savePwdError = await saveSecretPassword(formValues.password);
    if (savePwdError) {
      return { ok: false, code: savePwdError };
    }
  }
  return { ok: true };
}

export async function onLoadAtStartup(): Promise<{ profile: any | null; hasStoredPassword: boolean; password?: string | null; error?: PersistErrorCode }> {
  const { profile, error: profileError } = await loadProfile();
  if (profileError) {
    return { profile: null, hasStoredPassword: false, error: profileError };
  }
  const { password, error: pwdError } = await loadSecretPassword();
  const hasStoredPassword = password !== null;
  return { profile, hasStoredPassword, password, error: pwdError };
}

export async function onClearStoredData(): Promise<void> {
  await clearAll();
}

export const persistence = {
  onSaveClick,
  onLoadAtStartup,
  onClearStoredData
};