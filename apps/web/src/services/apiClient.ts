const API_HOST = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE_URL = `${API_HOST}/api/v1`;

class ApiClient {
  private token: string | null = null;
  private workspaceId: string | null = null;

  constructor() {
    this.token = localStorage.getItem('intellmeet_token');
    this.workspaceId = localStorage.getItem('intellmeet_workspace_id');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('intellmeet_token', token);
    } else {
      localStorage.removeItem('intellmeet_token');
    }
  }

  setWorkspaceId(workspaceId: string | null) {
    this.workspaceId = workspaceId;
    if (workspaceId) {
      localStorage.setItem('intellmeet_workspace_id', workspaceId);
    } else {
      localStorage.removeItem('intellmeet_workspace_id');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('intellmeet_token');
  }

  getWorkspaceId(): string | null {
    return this.workspaceId || localStorage.getItem('intellmeet_workspace_id');
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const currentToken = this.getToken();
    if (currentToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    const currentWsId = this.getWorkspaceId();
    if (currentWsId && !headers.has('x-workspace-id')) {
      headers.set('x-workspace-id', currentWsId);
    }

    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers
    });

    // Handle 401 Unauthorized with token refresh attempt
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (refreshResponse.ok) {
          const { accessToken } = await refreshResponse.json();
          this.setToken(accessToken);
          headers.set('Authorization', `Bearer ${accessToken}`);
          const retryResponse = await fetch(url, { credentials: 'include', ...options, headers });
          if (!retryResponse.ok) {
            const err = await retryResponse.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(err.error || `HTTP ${retryResponse.status}`);
          }
          return retryResponse.json() as Promise<T>;
        }
      } catch (refreshErr) {
        this.setToken(null);
        window.location.href = '/signin';
        throw new Error('Session expired. Please sign in again.');
      }
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(err.error || `Request failed with status ${response.status}`);
    }

    // Support empty response (e.g., 204 or file streams)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    return response.text() as Promise<T>;
  }

  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
