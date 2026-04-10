/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Applications from './pages/Applications';
import CreateJob from './pages/CreateJob';
import BulkUpload from './pages/BulkUpload';
import UsersManagement from './pages/UsersManagement';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import Interviews from './pages/Interviews';
import { useAuth } from './context/auth';
import { Card } from './components/ui/Card';
import type { UserRole } from './types';

// Simple error boundary to catch and display errors
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace' }}>
          <h1 style={{ color: 'red' }}>React Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button onClick={() => this.setState({ error: null })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function homeForRole(role: UserRole): string {
  return role === 'superadmin' || role === 'admin' ? '/users' : '/';
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
      <ErrorBoundary>
        <Toaster
          position="top-right"
          richColors
          closeButton
          expand={false}
          duration={4000}
        />
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
              <RequireRole allowed={['superadmin', 'admin', 'recruiter']}>
                <Applications />
              </RequireRole>
            }
          />
          <Route
            path="users"
            element={
              <RequireRole allowed={['superadmin', 'admin']}>
                <UsersManagement />
              </RequireRole>
            }
          />
          <Route path="settings" element={<Settings />} />
          <Route path="create-job" element={<CreateJob />} />
          <Route
            path="bulk-upload"
            element={
              <RequireRole allowed={['superadmin', 'admin', 'recruiter']}>
                <BulkUpload />
              </RequireRole>
            }
          />
          <Route
            path="interviews"
            element={
              <RequireRole allowed={['superadmin', 'admin', 'recruiter']}>
                <Interviews />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </ErrorBoundary>
    </Router>
  );
}
