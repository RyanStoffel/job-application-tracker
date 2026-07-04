import type { StoredAuth } from "./types";

const AUTH_KEY = "auth";

/** Read the stored auth (token + user) from chrome.storage.local, if any. */
export async function getStoredAuth(): Promise<StoredAuth | null> {
  const result = await chrome.storage.local.get(AUTH_KEY);
  const auth = result[AUTH_KEY] as StoredAuth | undefined;
  return auth ?? null;
}

export async function setStoredAuth(auth: StoredAuth): Promise<void> {
  await chrome.storage.local.set({ [AUTH_KEY]: auth });
}

export async function clearStoredAuth(): Promise<void> {
  await chrome.storage.local.remove(AUTH_KEY);
}
