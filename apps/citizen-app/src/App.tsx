import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/store/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

// Lazy-loaded pages
const LoginPage       = lazy(() => import('@/pages/LoginPage'));
const HomePage        = lazy(() => import('@/pages/HomePage'));
const NewComplaintPage= lazy(() => import('@/pages/NewComplaintPage'));
const ComplaintsPage  = lazy(() => import('@/pages/ComplaintsPage'));
const ComplaintDetailPage = lazy(() => import('@/pages/ComplaintDetailPage'));
const NotificationsPage   = lazy(() => import('@/pages/NotificationsPage'));
const ProfilePage     = lazy(() => import('@/pages/ProfilePage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (firebaseUser) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="complaints/new" element={<NewComplaintPage />} />
            <Route path="complaints" element={<ComplaintsPage />} />
            <Route path="complaints/:id" element={<ComplaintDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
