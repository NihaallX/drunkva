export const SIMPLE_AUTH_STORAGE_KEY = "drunkva_user";

export interface SimpleAuthUser {
  id: string;
  real_name: string;
  alias: string | null;
  email: string;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function getSimpleUser(): SimpleAuthUser | null {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(SIMPLE_AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SimpleAuthUser>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.real_name !== "string" ||
      typeof parsed.email !== "string"
    ) {
      return null;
    }

    return {
      id: parsed.id,
      real_name: parsed.real_name,
      alias: typeof parsed.alias === "string" ? parsed.alias : null,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

export function setSimpleUser(user: SimpleAuthUser) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SIMPLE_AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearSimpleUser() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SIMPLE_AUTH_STORAGE_KEY);
}

export function isSimpleLoggedIn(): boolean {
  return getSimpleUser() !== null;
}
