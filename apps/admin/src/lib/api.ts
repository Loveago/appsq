export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('vynotes_api_base');
    if (saved) return saved;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://appsq-two.vercel.app';
}

export function setApiBase(url: string) {
  if (typeof window !== 'undefined') {
    if (!url) {
      localStorage.removeItem('vynotes_api_base');
    } else {
      localStorage.setItem('vynotes_api_base', url.replace(/\/+$/, ''));
    }
  }
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mindora_admin_token') || sessionStorage.getItem('mindora_admin_token');
}

export function setAdminToken(token: string, remember: boolean = true) {
  if (typeof window === 'undefined') return;
  if (remember) {
    localStorage.setItem('mindora_admin_token', token);
  } else {
    sessionStorage.setItem('mindora_admin_token', token);
  }
}

export function clearAdminToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('mindora_admin_token');
  sessionStorage.removeItem('mindora_admin_token');
}

export async function adminFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAdminToken();
  const apiBase = getApiBase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new Error(`Cannot connect to backend at ${apiBase}. Please verify the server is running.`);
  }

  if (response.status === 401 || response.status === 403) {
    // Session expired or unauthorized
    if (endpoint !== '/auth/login') {
      clearAdminToken();
      const isUnauth = response.status === 401;
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || (isUnauth ? 'Session expired. Please sign in again.' : 'Access restricted to administrators.'));
    }
  }

  if (response.status === 404) {
    throw new Error(`Endpoint "${endpoint}" not found (404) on backend ${apiBase}. Please redeploy or update your backend.`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed: ${response.statusText}`);
  }

  return response.json();
}
