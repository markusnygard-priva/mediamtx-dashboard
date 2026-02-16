
// Helper to get credentials from environment variables (for server-side)
function getEnvUsername(): string | null {
  return process.env.MEDIAMTX_API_USERNAME || null;
}

function getEnvPassword(): string | null {
  return process.env.MEDIAMTX_API_PASSWORD || null;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("mediamtx_auth");
}

export function getUsername(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem("mediamtx_username")
}

export function setAuthToken(token: string, username: string) {
  sessionStorage.setItem("mediamtx_auth", token)
  sessionStorage.setItem("mediamtx_username", username)
}

export function clearAuth() {
  sessionStorage.removeItem("mediamtx_auth")
  sessionStorage.removeItem("mediamtx_username")
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null
}

export function getAuthHeader(): string {
  // Try to use credentials from .env (server-side)
  const envUser = getEnvUsername();
  const envPass = getEnvPassword();
  if (envUser && envPass) {
    const encoded = Buffer.from(`${envUser}:${envPass}`).toString("base64");
    return `Basic ${encoded}`;
  }
  // Fallback to sessionStorage (client-side)
  const token = getAuthToken();
  return token ? `Basic ${token}` : "";
}
