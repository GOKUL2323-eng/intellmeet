import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { apiClient } from './services/apiClient';

// Layout & Pages
import { AppLayout } from './components/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { PreMeetingLobbyPage } from './pages/PreMeetingLobbyPage';
import { MeetingRoomPage } from './pages/MeetingRoomPage';
import { MeetingDetailsPage } from './pages/MeetingDetailsPage';
import { TasksKanbanPage } from './pages/TasksKanbanPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, logout } = useAuthStore();
  const [showSlowNotice, setShowSlowNotice] = useState(false);

  useEffect(() => {
    let slowTimer: NodeJS.Timeout;
    let hardFallbackTimer: NodeJS.Timeout;

    if (isLoading) {
      slowTimer = setTimeout(() => {
        setShowSlowNotice(true);
      }, 2500);

      // Ultimate fail-safe: never trap user on loading screen for more than 9 seconds
      hardFallbackTimer = setTimeout(() => {
        useAuthStore.setState({ isLoading: false, isAuthenticated: false });
      }, 9000);
    } else {
      setShowSlowNotice(false);
    }

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(hardFallbackTimer);
    };
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#0B0F19] flex flex-col items-center justify-center text-slate-400 text-xs px-4 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-violet-500 animate-ping" />
          <span className="text-slate-300 font-medium">Verifying IntellMeet session...</span>
        </div>

        {showSlowNotice && (
          <div className="flex flex-col items-center gap-2.5 text-center max-w-sm mt-4 animate-fade-in">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Connecting to IntellMeet Cloud. Waking up secure cloud instance, this may take a few moments...
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/signin';
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition border border-white/10"
              >
                Go to Sign In
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs transition font-medium"
              >
                Reload
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Eagerly ping the backend in the background to wake up cold-start cloud containers (e.g. Render)
    let isMounted = true;
    let attempts = 0;
    const warmUp = async () => {
      try {
        await apiClient.get('/health', { timeoutMs: 15000 });
      } catch {
        attempts++;
        if (isMounted && attempts < 4) {
          setTimeout(warmUp, 3500);
        }
      }
    };
    warmUp();
    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Meeting Session Routes */}
        <Route path="/lobby/:meetingId" element={<PreMeetingLobbyPage />} />
        <Route path="/meeting/:meetingId" element={<MeetingRoomPage />} />

        {/* Authenticated Workspace Application */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/meetings/:meetingId" element={<MeetingDetailsPage />} />
          <Route path="/tasks" element={<TasksKanbanPage />} />
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Route>

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
