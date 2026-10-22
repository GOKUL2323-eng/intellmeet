const normalizeApiUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
};

const API_HOST = normalizeApiUrl(import.meta.env.VITE_API_URL);
const API_BASE_URL = `${API_HOST}/api/v1`;

class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private workspaceId: string | null = null;

  constructor() {
    this.token = localStorage.getItem('intellmeet_token');
    this.refreshToken = localStorage.getItem('intellmeet_refresh_token');
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

  setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken;
    if (refreshToken) {
      localStorage.setItem('intellmeet_refresh_token', refreshToken);
    } else {
      localStorage.removeItem('intellmeet_refresh_token');
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

  getRefreshToken(): string | null {
    return this.refreshToken || localStorage.getItem('intellmeet_refresh_token');
  }

  getWorkspaceId(): string | null {
    return this.workspaceId || localStorage.getItem('intellmeet_workspace_id');
  }

  hasTokens(): boolean {
    return !!(this.getToken() || this.getRefreshToken());
  }

  clearAuth() {
    this.setToken(null);
    this.setRefreshToken(null);
    this.setWorkspaceId(null);
  }

  async request<T>(endpoint: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const { timeoutMs = 60000, ...fetchOptions } = options;
    const headers = new Headers(fetchOptions.headers || {});

    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
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

    const controller = new AbortController();
    let isTimedOut = false;
    const timeoutTimer = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, timeoutMs);

    if (fetchOptions.signal) {
      fetchOptions.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        credentials: 'include',
        ...fetchOptions,
        headers,
        signal: controller.signal
      });

      // Handle 401 Unauthorized with token refresh attempt
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        const storedRefreshToken = this.getRefreshToken();
        try {
          const refreshHeaders = new Headers({ 'Content-Type': 'application/json' });
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: refreshHeaders,
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
            signal: controller.signal
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData?.accessToken) {
              this.setToken(refreshData.accessToken);
              if (refreshData.refreshToken) {
                this.setRefreshToken(refreshData.refreshToken);
              }
              headers.set('Authorization', `Bearer ${refreshData.accessToken}`);
              const retryResponse = await fetch(url, {
                credentials: 'include',
                ...fetchOptions,
                headers,
                signal: controller.signal
              });
              if (!retryResponse.ok) {
                const err = await retryResponse.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(err.error || `HTTP ${retryResponse.status}`);
              }
              const contentType = retryResponse.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                return retryResponse.json() as Promise<T>;
              }
              return retryResponse.text() as Promise<T>;
            }
          }
          this.clearAuth();
        } catch (refreshErr) {
          this.clearAuth();
          throw new Error('Session expired. Please sign in again.');
        }
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(err.error || `Request failed with status ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json() as Promise<T>;
      }

      // If unexpected HTML is returned on an API route, reject instead of parsing as JSON
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Invalid server response: received HTML document instead of JSON data.');
      }

      return response.text() as Promise<T>;
    } catch (err: any) {
      if (isTimedOut || err?.name === 'AbortError') {
        throw new Error(`The cloud server took longer than expected to respond (it may be waking up from cold sleep). Please retry now.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutTimer);
    }
  }

  get<T>(endpoint: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  delete<T>(endpoint: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
