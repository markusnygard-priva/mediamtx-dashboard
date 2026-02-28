// 1. DYNAMIC CONFIGURATION
const BASE_URL = process.env.NEXT_PUBLIC_MEDIAMTX_API_URL || "http://192.168.8.23:9997";
const MEDIAMTX_API_URL = `${BASE_URL}/v3`;

// 2. DATA DICTIONARIES (TYPES)
export interface PathConfig {
  name: string;
  source?: string;
  sourceOnDemand?: boolean;
  [key: string]: any; 
}

export interface Path {
  name: string;
  sourceType: string;
  ready: boolean;
  tracks: string[];
  readers: any[];
  [key: string]: any;
}

// 3. THE CORE API ENGINE
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

// 4. EXPORTED ACTIONS
export const getPathConfigs = () => fetchAPI("/config/paths/list");
export const getPaths = () => fetchAPI("/paths/list");

export const addPath = (name: string, source: string) => {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const timedName = `${name}_${dateStr}`;

  return fetchAPI(`/config/paths/add/${timedName}`, {
    method: "POST",
    body: JSON.stringify({ 
      source,
      runOnReady: `sleep 691200 && curl -X DELETE http://localhost:9997/v3/config/paths/delete/${timedName}`,
      runOnReadyRestart: false 
    }),
  });
};

// --- NEW: RENEW LOGIC (+1 YEAR) ---
export const renewPath = async (oldName: string, source: string) => {
  // Strip the old date suffix to get the base name
  const baseName = oldName.split('_').slice(0, -1).join('_') || oldName;
  
  // Calculate date 1 year from now
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const dateStr = nextYear.toISOString().split('T')[0].replace(/-/g, '');
  const newTimedName = `${baseName}_${dateStr}`;

  // 1. Create the new path configuration
  await fetchAPI(`/config/paths/add/${newTimedName}`, {
    method: "POST",
    body: JSON.stringify({ 
      source,
      runOnReady: `sleep 691200 && curl -X DELETE http://localhost:9997/v3/config/paths/delete/${newTimedName}`,
      runOnReadyRestart: false 
    }),
  });

  // 2. Delete the old path configuration
  return fetchAPI(`/config/paths/delete/${oldName}`, {
    method: "DELETE",
  });
};

export const updatePath = (name: string, source: string) =>
  fetchAPI(`/config/paths/patch/${name}`, {
    method: "PATCH",
    body: JSON.stringify({ source }),
  });

export const deletePath = (name: string) =>
  fetchAPI(`/config/paths/delete/${name}`, {
    method: "DELETE",
  });