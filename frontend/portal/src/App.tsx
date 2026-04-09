/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Applications from './pages/Applications';
import CreateJob from './pages/CreateJob';
import BulkUpload from './pages/BulkUpload';
import UsersManagement from './pages/UsersManagement';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { useAuth } from './context/auth';
import { Card } from './components/ui/Card';
import type { UserRole } from './types';

function homeForRole(role: UserRole): string {
  return role === 'admin' ? '/users' : '/';
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <Card variant="low">Loading session…</Card>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RequireRole({ allowed, children }: { allowed: UserRole[]; children: ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowed.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route
            path="applications"
            element={
              <RequireRole allowed={['recruiter']}>
                <Applications />
              </RequireRole>
            }
          />
          <Route
            path="users"
            element={
              <RequireRole allowed={['admin']}>
                <UsersManagement />
              </RequireRole>
            }
          />
          <Route path="settings" element={<Settings />} />
          <Route path="create-job" element={<CreateJob />} />
          <Route
            path="bulk-upload"
            element={
              <RequireRole allowed={['recruiter']}>
                <BulkUpload />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
