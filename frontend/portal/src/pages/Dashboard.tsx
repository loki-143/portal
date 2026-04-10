import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import {
  BarChart3,
  TrendingUp,
  Users,
  Zap,
  Star,
  Briefcase,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  UserPlus,
  Calendar,
} from 'lucide-react';
import { jobsApi, applicationsApi } from '../services/api';
import type { Job, Application } from '../types';
import { useAuth } from '../context/auth';

// ============================================================
// METRICS HELPERS
// ============================================================

function computeRecruiterMetrics(jobs: Job[], applications: Application[]) {
  return {
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => j.status === 'active').length,
    draftJobs: jobs.filter(j => j.status === 'draft').length,
    closedJobs: jobs.filter(j => j.status === 'closed').length,
    totalApplications: applications.length,
    applied: applications.filter(a => a.status === 'Applied').length,
    underReview: applications.filter(a => a.status === 'Under Review').length,
    shortlisted: applications.filter(a => a.status === 'Shortlisted').length,
    interview: applications.filter(a => a.status.includes('Interview')).length,
    offered: applications.filter(a => a.status === 'Offered').length,
    hired: applications.filter(a => a.status === 'Hired').length,
    rejected: applications.filter(a => a.status === 'Rejected').length,
  };
}

function computeAdminMetrics(jobs: Job[], applications: Application[]) {
  return {
    activeJobs: jobs.filter(j => j.status === 'active').length,
    totalApplications: applications.length,
    applied: applications.filter(a => a.status === 'Applied').length,
    shortlisted: applications.filter(a => a.status === 'Shortlisted').length,
    hired: applications.filter(a => a.status === 'Hired').length,
  };
}

// ============================================================
// RECRUITER DASHBOARD VIEW
// ============================================================

function RecruiterDashboardView() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [jobsRes, appsRes] = await Promise.all([
          jobsApi.list({ limit: 50 }),
          applicationsApi.list({ limit: 50 }),
        ]);

        if (cancelled) return;

        setJobs(jobsRes.jobs || []);
        setApplications(appsRes.applications || []);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const metrics = computeRecruiterMetrics(jobs, applications);

  const recentApplications = applications
    .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card variant="low" className="text-center py-12">Loading dashboard…</Card>
    );
  }

  if (error) {
    return (
      <Card variant="low" className="text-error">
        {error}
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <header>
        <h1 className="display-md">Welcome back{user?.first_name ? `, ${user.first_name}` : ''}</h1>
        <p className="text-on-surface-variant font-medium mt-1">Here's what's happening with your hiring pipeline.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="highest">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Active Jobs</p>
              <p className="text-2xl font-black">{metrics.activeJobs}</p>
            </div>
          </div>
        </Card>
        <Card variant="high">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Applications</p>
              <p className="text-2xl font-black">{metrics.totalApplications}</p>
            </div>
          </div>
        </Card>
        <Card variant="low">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Shortlisted</p>
              <p className="text-2xl font-black">{metrics.shortlisted}</p>
            </div>
          </div>
        </Card>
        <Card variant="low">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Hired</p>
              <p className="text-2xl font-black">{metrics.hired}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pipeline Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Applied', count: metrics.applied, icon: Clock, color: 'text-blue-600' },
          { label: 'Under Review', count: metrics.underReview, icon: BarChart3, color: 'text-purple-600' },
          { label: 'Shortlisted', count: metrics.shortlisted, icon: Star, color: 'text-yellow-600' },
          { label: 'Interview', count: metrics.interview, icon: Calendar, color: 'text-indigo-600' },
          { label: 'Offered', count: metrics.offered, icon: TrendingUp, color: 'text-pink-600' },
          { label: 'Rejected', count: metrics.rejected, icon: XCircle, color: 'text-red-600' },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label} variant="low" className="text-center py-4">
            <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
            <p className="text-xl font-black">{count}</p>
            <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">{label}</p>
          </Card>
        ))}
      </div>

      {/* Recent Applications */}
      <Card className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Recent Applications
        </h2>

        {recentApplications.length === 0 ? (
          <p className="text-on-surface-variant text-center py-8">No applications yet.</p>
        ) : (
          <div className="space-y-3">
            {recentApplications.map((app) => (
              <div key={app.id} className="flex items-center justify-between py-3 border-b border-outline-variant/10 last:border-0">
                <div>
                  <p className="font-bold text-sm">Candidate: {app.candidate_id.slice(0, 8)}...</p>
                  <p className="text-xs text-on-surface-variant/50">
                    {app.jobs ? (app.jobs as any).title || 'Unknown Job' : 'Unknown Job'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                    app.status === 'Applied' ? 'bg-blue-100 text-blue-800' :
                    app.status === 'Shortlisted' ? 'bg-yellow-100 text-yellow-800' :
                    app.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {app.status}
                  </span>
                  <span className="text-xs text-on-surface-variant/50">
                    {new Date(app.applied_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Active Jobs */}
      <Card className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          Active Jobs
        </h2>

        {jobs.filter(j => j.status === 'active').length === 0 ? (
          <p className="text-on-surface-variant text-center py-8">No active jobs. Create one to get started.</p>
        ) : (
          <div className="space-y-3">
            {jobs.filter(j => j.status === 'active').map((job) => {
              const jobAppCount = applications.filter(a => a.job_id === job.id).length;
              return (
                <div key={job.id} className="flex items-center justify-between py-3 border-b border-outline-variant/10 last:border-0">
                  <div>
                    <p className="font-bold">{job.title}</p>
                    <p className="text-xs text-on-surface-variant/50">
                      {job.department || 'No department'} · {job.location || 'Remote'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-on-surface-variant/70">{jobAppCount} applicants</span>
                    <span className="text-xs text-on-surface-variant/50">
                      {new Date(job.posted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// ADMIN DASHBOARD VIEW
// ============================================================

function AdminDashboardView() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [jobsRes, appsRes] = await Promise.all([
          jobsApi.list({ limit: 100 }),
          applicationsApi.list({ limit: 100 }),
        ]);

        if (cancelled) return;

        setJobs(jobsRes.jobs || []);
        setApplications(appsRes.applications || []);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const metrics = computeAdminMetrics(jobs, applications);

  if (isLoading) {
    return (
      <Card variant="low" className="text-center py-12">Loading dashboard…</Card>
    );
  }

  if (error) {
    return (
      <Card variant="low" className="text-error">{error}</Card>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="display-md">Admin Dashboard{user?.first_name ? `, ${user.first_name}` : ''}</h1>
        <p className="text-on-surface-variant font-medium mt-1">System overview and platform metrics.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="highest">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Active Jobs</p>
              <p className="text-2xl font-black">{metrics.activeJobs}</p>
            </div>
          </div>
        </Card>
        <Card variant="high">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Applications</p>
              <p className="text-2xl font-black">{metrics.totalApplications}</p>
            </div>
          </div>
        </Card>
        <Card variant="low">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Shortlisted</p>
              <p className="text-2xl font-black">{metrics.shortlisted}</p>
            </div>
          </div>
        </Card>
        <Card variant="low">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Hired</p>
              <p className="text-2xl font-black">{metrics.hired}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="space-y-6">
        <h2 className="text-xl font-bold">Pipeline Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Applied', count: metrics.applied, color: 'text-blue-600' },
            { label: 'Shortlisted', count: metrics.shortlisted, color: 'text-yellow-600' },
            { label: 'Hired', count: metrics.hired, color: 'text-green-600' },
            { label: 'Draft Jobs', count: jobs.filter(j => j.status === 'draft').length, color: 'text-on-surface-variant/50' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center p-4 bg-surface-container-low rounded-lg">
              <p className={`text-3xl font-black ${color}`}>{count}</p>
              <p className="text-xs text-on-surface-variant/50 uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role ?? 'recruiter';

  return role === 'superadmin' || role === 'admin' ? <AdminDashboardView /> : <RecruiterDashboardView />;
}
