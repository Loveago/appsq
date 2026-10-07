const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://mindora-backend-jbxx.onrender.com';

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // Session expired or unauthorized
    if (endpoint !== '/auth/login') {
      const isUnauth = response.status === 401;
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || (isUnauth ? 'Session expired. Please sign in again.' : 'Access restricted to administrators.'));
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed: ${response.statusText}`);
  }

  return response.json();
}
