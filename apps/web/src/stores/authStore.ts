import { create } from 'zustand';
import { apiClient } from '../services/apiClient';
import { IUser, IWorkspace, WorkspaceRole } from '@intellmeet/shared';

interface AuthState {
  user: IUser | null;
  workspace: { id: string; name: string; slug: string; role: WorkspaceRole } | null;
  workspaces: Array<{ id: string; name: string; slug: string; role: WorkspaceRole }>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  fetchWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  workspace: null,
  workspaces: [],
  isAuthenticated: !!apiClient.getToken(),
  isLoading: apiClient.hasTokens(),
  error: null,

  login: async (email: string, pass: string) => {
    set({ isLoading: true, error: null });
    try {
      const data: any = await apiClient.post('/auth/login', { email, password: pass }, { timeoutMs: 60000 });
      apiClient.setToken(data.accessToken);

      if (data.refreshToken) {
        apiClient.setRefreshToken(data.refreshToken);
      }

      if (data.workspace) {
        apiClient.setWorkspaceId(data.workspace.id);
      }

      set({
        user: data.user,
        workspace: data.workspace,
        isAuthenticated: true,
        isLoading: false
      });

      await get().fetchWorkspaces();
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  register: async (email: string, pass: string, fullName: string) => {
    set({ isLoading: true, error: null });
    try {
      const data: any = await apiClient.post(
        '/auth/register',
        {
          email,
          password: pass,
          fullName
        },
        { timeoutMs: 60000 }
      );
      apiClient.setToken(data.accessToken);

      if (data.refreshToken) {
        apiClient.setRefreshToken(data.refreshToken);
      }

      if (data.workspace) {
        apiClient.setWorkspaceId(data.workspace.id);
      }

      set({
        user: data.user,
        workspace: data.workspace,
        isAuthenticated: true,
        isLoading: false
      });

      await get().fetchWorkspaces();
    } catch (err: any) {
      set({ error: err.message || 'Registration failed', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const refreshToken = apiClient.getRefreshToken();
    try {
      await apiClient.post('/auth/logout', { refreshToken }, { timeoutMs: 4000 });
    } catch (err) {
      // Ignore logout failure
    }
    apiClient.clearAuth();
    set({
      user: null,
      workspace: null,
      workspaces: [],
      isAuthenticated: false,
      isLoading: false
    });
  },

  checkAuth: async () => {
    let token = apiClient.getToken();
    const storedRefreshToken = apiClient.getRefreshToken();

    // Fast-path: If user has no credentials stored, skip network requests completely.
    // This eliminates any loading delay on cold servers for unauthenticated visitors.
    if (!token && !storedRefreshToken) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    if (!token && storedRefreshToken) {
      try {
        const refreshData: any = await apiClient.post(
          '/auth/refresh',
          { refreshToken: storedRefreshToken },
          { timeoutMs: 20000 }
        );
        if (refreshData?.accessToken) {
          apiClient.setToken(refreshData.accessToken);
          if (refreshData.refreshToken) {
            apiClient.setRefreshToken(refreshData.refreshToken);
          }
          token = refreshData.accessToken;
        }
      } catch {
        apiClient.clearAuth();
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }
    }

    if (!token) {
      apiClient.clearAuth();
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const data: any = await apiClient.get('/auth/me', { timeoutMs: 20000 });
      if (data && data.user) {
        set({ user: data.user, isAuthenticated: true });
        get().fetchWorkspaces().catch(() => {});
      } else {
        throw new Error('Invalid user payload');
      }
    } catch (err) {
      apiClient.clearAuth();
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWorkspaces: async () => {
    try {
      const data: any = await apiClient.get('/workspaces');
      const workspaces = data.workspaces || [];
      set({ workspaces });

      const currentWsId = apiClient.getWorkspaceId();
      const current = workspaces.find((w: any) => w.id === currentWsId) || workspaces[0];

      if (current) {
        apiClient.setWorkspaceId(current.id);
        set({ workspace: current });
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  },

  switchWorkspace: (workspaceId: string) => {
    const target = get().workspaces.find(w => w.id === workspaceId);
    if (target) {
      apiClient.setWorkspaceId(target.id);
      set({ workspace: target });
      window.location.reload();
    }
  },

  clearError: () => set({ error: null })
}));
