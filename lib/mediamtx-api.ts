const MEDIAMTX_API_URL = "http://192.168.8.23:9997/v3";

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${MEDIAMTX_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API error: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const getPathConfigs = () => fetchAPI("/config/paths/list");
export const getPaths = () => fetchAPI("/paths/list");

// This creates a NEW path
export const addPath = (name: string, source: string) =>
  fetchAPI(`/config/paths/add/${name}`, {
    method: "POST",
    body: JSON.stringify({ source }),
  });

// This UPDATES an existing path (The "Secondary RTSP as Patch" logic)
export const updatePath = (name: string, source: string) =>
  fetchAPI(`/config/paths/patch/${name}`, {
    method: "PATCH",
    body: JSON.stringify({ source }),
  });

export const deletePath = (name: string) =>
  fetchAPI(`/config/paths/delete/${name}`, {
    method: "DELETE",
  });