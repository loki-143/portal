import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import {
  AlertCircle,
  BarChart3,
  Clock,
  TrendingUp,
  Users,
  Zap,
  Star,
} from 'lucide-react';
import { motion } from 'motion/react';
import { applicationsApi, jobsApi, usersApi } from '../services/api';
import type { Application, Job, User } from '../types';
import { useAuth } from '../context/auth';

function buildAvatarUrl(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/100/100`;
}

function computeRecruiterMetrics(jobs: Job[], applications: Application[]) {
  const timeToHireSamples = jobs
    .map((job) => job.timeToHireDays)
    .filter((value): value is number => value !== null);

  const shortlisted = applications.filter((application) => application.status === 'Shortlisted');
  const pending = applications.filter((application) => application.status === 'Pending');
  const rejected = applications.filter((application) => application.status === 'Rejected');

  return {
    totalJobs: jobs.length,
    activeJobs: jobs.filter((job) => job.status === 'Active').length,
    totalApplicants: jobs.reduce((total, job) => total + job.applicants, 0),
    newApplications: jobs.reduce((total, job) => total + job.newToday, 0),
    averageTimeToHireDays:
      timeToHireSamples.length > 0
        ? Math.round(timeToHireSamples.reduce((total, value) => total + value, 0) / timeToHireSamples.length)
        : 0,
    totalApplications: applications.length,
    shortlistedApplications: shortlisted.length,
    pendingApplications: pending.length,
    rejectedApplications: rejected.length,
    averageMatchScore:
      applications.length > 0
        ? Math.round(
            applications.reduce((total, application) => total + application.match, 0) / applications.length,
          )
        : 0,
    shortlistRate:
      applications.length > 0 ? Math.round((shortlisted.length / applications.length) * 100) : 0,
  };
}

function RecruiterDashboardView() {
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
        const [jobsResponse, applicationsResponse] = await Promise.all([
          jobsApi.list(),
          applicationsApi.list(),
        ]);

        if (cancelled) {
          return;
        }

        setJobs(jobsResponse);
        setApplications(applicationsResponse);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError((err as Error).message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => computeRecruiterMetrics(jobs, applications), [jobs, applications]);

  const shortlistPreview = useMemo(
    () => applications.filter((application) => application.status === 'Shortlisted').slice(0, 3),
    [applications],
  );

  if (isLoading) {
    return (
      <div className="space-y-12">
        <header className="space-y-2">
          <h1 className="display-lg">Recruiter Dashboard</h1>
          <p className="text-lg font-medium text-secondary opacity-70">
            Loading CSV-backed metrics…
          </p>
        </header>
        <Card variant="low">Loading dashboard data…</Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-12">
        <header className="space-y-2">
          <h1 className="display-lg">Recruiter Dashboard</h1>
          <p className="text-lg font-medium text-secondary opacity-70">CSV-backed API error</p>
        </header>
        <Card variant="low" className="text-error">
          {error}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <header className="space-y-2">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="display-lg"
        >
          Recruiter Dashboard
        </motion.h1>
        <p className="text-lg font-medium text-secondary opacity-70">
          Overview of the CSV-backed recruiter workspace
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Primary Metric Card */}
        <Card className="md:col-span-2 relative overflow-hidden group flex flex-col justify-between min-h-[320px]">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-primary-container/10 rounded-full text-primary">
                <Users className="w-6 h-6" />
              </div>
              <span className="label-md text-[10px] text-on-surface-variant/60">Pipeline Volume</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-7xl font-black tracking-tighter">
                {metrics.totalApplicants.toLocaleString()}
              </span>
              <span className="text-primary-container font-bold bg-primary-container/10 px-3 py-1 rounded-full text-sm">
                {metrics.activeJobs} active roles
              </span>
            </div>
          </div>
          <div className="mt-12 h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(metrics.shortlistRate, 12)}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="h-full soul-gradient rounded-full"
            />
          </div>
        </Card>

        {/* Under Review */}
        <Card variant="low" className="flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div className="space-y-4">
            <div className="p-3 bg-secondary-container/30 w-fit rounded-full text-secondary">
              <Clock className="w-6 h-6" />
            </div>
            <span className="block text-on-surface-variant font-medium text-sm">Under Review</span>
            <span className="block text-5xl font-black tracking-tighter">{metrics.pendingApplications}</span>
          </div>
          <div className="pt-8 flex justify-between items-center text-xs text-on-surface-variant/40 font-medium">
            <span>{metrics.totalApplications} applications in system</span>
            <TrendingUp className="w-4 h-4" />
          </div>
        </Card>

        {/* AI Score Card */}
        <Card className="soul-gradient text-on-primary border-none flex flex-col justify-between group overflow-hidden relative">
          <div className="space-y-4 relative z-10">
            <div className="p-3 bg-white/20 w-fit rounded-full">
              <Zap className="w-6 h-6" />
            </div>
            <span className="block opacity-90 font-medium text-sm">Average AI Score</span>
            <span className="block text-6xl font-black tracking-tighter">{metrics.averageMatchScore}%</span>
          </div>
          <div className="relative z-10 flex items-center gap-2 text-sm opacity-80 pt-8">
            <Star className="w-4 h-4 fill-current" />
            Based on current applications
          </div>
          <BarChart3 className="absolute bottom-0 right-0 opacity-10 translate-y-1/4 translate-x-1/4 w-48 h-48" />
        </Card>

        {/* Shortlisted */}
        <Card variant="low" className="flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div className="space-y-4">
            <div className="p-3 bg-primary-container/10 w-fit rounded-full text-primary-container">
              <Users className="w-6 h-6" />
            </div>
            <span className="block text-on-surface-variant font-medium text-sm">Shortlisted</span>
            <span className="block text-5xl font-black tracking-tighter">{metrics.shortlistedApplications}</span>
          </div>
          <div className="pt-8 flex -space-x-3">
            {shortlistPreview.map((application) => (
              <img
                key={application.id}
                src={buildAvatarUrl(application.avatarSeed || application.name.toLowerCase().replace(/\s+/g, '-'))}
                alt={application.name}
                className="w-8 h-8 rounded-full border-2 border-surface-container-low"
                referrerPolicy="no-referrer"
              />
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-surface-container-low bg-surface-container-high flex items-center justify-center text-[10px] font-bold">
              +{Math.max(metrics.shortlistedApplications - shortlistPreview.length, 0)}
            </div>
          </div>
        </Card>

        {/* Rejected */}
        <Card variant="low" className="flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div className="space-y-4">
            <div className="p-3 bg-error-container/30 w-fit rounded-full text-error">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="block text-on-surface-variant font-medium text-sm">Rejected</span>
            <span className="block text-5xl font-black tracking-tighter">{metrics.rejectedApplications}</span>
          </div>
          <div className="pt-8">
            <div className="text-xs text-error font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Review CSV entries before moving to DB-backed flows
            </div>
          </div>
        </Card>
      </div>

      <footer className="mt-24 text-center max-w-2xl mx-auto opacity-40">
        <p className="text-lg italic font-medium leading-relaxed">
          "Precision in hiring isn't about finding the most applicants, but the most aligned potential."
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="w-12 h-[1px] bg-on-surface" />
          <span className="text-[10px] label-md">Coastal Seven Intelligence</span>
          <div className="w-12 h-[1px] bg-on-surface" />
        </div>
      </footer>
    </div>
  );
}

function AdminDashboardView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [jobsResponse, applicationsResponse, usersResponse] = await Promise.all([
          jobsApi.list(),
          applicationsApi.list(),
          usersApi.list(),
        ]);

        if (cancelled) {
          return;
        }

        setJobs(jobsResponse);
        setApplications(applicationsResponse);
        setUsers(usersResponse);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError((err as Error).message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const averageMatchScore = useMemo(() => {
    if (applications.length === 0) {
      return 0;
    }
    return Math.round(applications.reduce((total, application) => total + application.match, 0) / applications.length);
  }, [applications]);

  const applicationsByWeekday = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const counts = new Array<number>(7).fill(0);

    for (const application of applications) {
      const date = new Date(`${application.date}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      if (date < start || date > today) {
        continue;
      }

      counts[date.getDay()] += 1;
    }

    // Order: Mon..Sun
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map((day) => counts[day]);
  }, [applications]);

  const barHeights = useMemo(() => {
    const max = Math.max(0, ...applicationsByWeekday);
    return applicationsByWeekday.map((value) => (max > 0 ? Math.round((value / max) * 100) : 0));
  }, [applicationsByWeekday]);

  const peakIndex = useMemo(() => {
    let bestIndex = 0;
    let bestValue = -1;
    for (let i = 0; i < applicationsByWeekday.length; i += 1) {
      if (applicationsByWeekday[i] > bestValue) {
        bestValue = applicationsByWeekday[i];
        bestIndex = i;
      }
    }
    return bestIndex;
  }, [applicationsByWeekday]);

  const activeJobs = useMemo(() => jobs.filter((job) => job.status === 'Active').length, [jobs]);
  const activeUsers = useMemo(() => users.filter((user) => user.status === 'Active').length, [users]);

  return (
    <div className="space-y-16">
      <header className="space-y-2">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="display-lg">
          Admin Portal
        </motion.h1>
        <p className="text-lg font-medium text-secondary opacity-70">Admin stats powered by CSV-backed APIs</p>
      </header>

      {isLoading && <Card variant="low">Loading admin metrics…</Card>}
      {error && (
        <Card variant="low" className="text-error">
          {error}
        </Card>
      )}

      {!isLoading && !error && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface-container-lowest p-8 rounded-lg shadow-luminous relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="w-32 h-32" />
              </div>
              <label className="block text-[10px] uppercase tracking-[0.1em] font-bold text-primary mb-4">
                Live Performance
              </label>
              <h3 className="text-xl font-bold mb-6">Applications per day</h3>
              <div className="flex items-end gap-2 h-32 mb-4">
                {barHeights.map((height, i) => (
                  <div
                    key={i}
                    className={`w-full rounded-t-lg transition-all duration-500 ${i === peakIndex ? 'bg-primary' : 'bg-primary-container/30'}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant font-medium">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-surface-container-lowest p-8 rounded-lg shadow-luminous flex flex-col justify-between"
            >
              <div>
                <label className="block text-[10px] uppercase tracking-[0.1em] font-bold text-primary mb-4">
                  Neural Engine
                </label>
                <h3 className="text-xl font-bold">AI Accuracy Rate</h3>
              </div>
              <div className="py-4 flex justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      className="stroke-surface-container-highest"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      className="stroke-primary"
                      strokeWidth="3"
                      pathLength={100}
                      strokeDasharray={`${averageMatchScore} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-extrabold text-on-surface">
                      {averageMatchScore}
                      <span className="text-lg font-medium text-on-surface-variant">%</span>
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant text-center">Based on average match scores.</p>
            </motion.div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-luminous">
              <label className="block text-[10px] uppercase tracking-[0.1em] font-bold text-primary mb-3">Users</label>
              <div className="text-4xl font-black tracking-tight">{users.length}</div>
              <p className="text-sm text-on-surface-variant mt-2">{activeUsers} active</p>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-luminous">
              <label className="block text-[10px] uppercase tracking-[0.1em] font-bold text-primary mb-3">Jobs</label>
              <div className="text-4xl font-black tracking-tight">{jobs.length}</div>
              <p className="text-sm text-on-surface-variant mt-2">{activeJobs} active</p>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-luminous">
              <label className="block text-[10px] uppercase tracking-[0.1em] font-bold text-primary mb-3">Applications</label>
              <div className="text-4xl font-black tracking-tight">{applications.length}</div>
              <p className="text-sm text-on-surface-variant mt-2">Last 7 days chart above</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role ?? 'recruiter';

  return role === 'admin' ? <AdminDashboardView /> : <RecruiterDashboardView />;
}
