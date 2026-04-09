import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Briefcase,
  Edit3,
  LayoutGrid,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { applicationsApi, jobsApi } from '../services/api';
import type { Application, Job, JobStatus } from '../types';
import { cn } from '../lib/utils';

/*
const jobs = [
  {
    id: 1,
    title: 'Senior UX Designer',
    department: 'Design',
    location: 'San Francisco, CA',
    status: 'Active',
    applicants: 128,
    newToday: 12,
    postedDate: 'Oct 12, 2023',
    icon: LayoutGrid,
    iconBg: 'bg-primary-container/10',
    iconColor: 'text-primary-container'
  },
  {
    id: 2,
    title: 'Product Manager',
    department: 'Product',
    location: 'Remote',
    status: 'Active',
    applicants: 84,
    newToday: 4,
    postedDate: 'Oct 08, 2023',
    icon: Briefcase,
    iconBg: 'bg-secondary-container/30',
    iconColor: 'text-secondary'
  },
  {
    id: 3,
    title: 'Lead Backend Engineer',
    department: 'Engineering',
    location: 'New York, NY',
    status: 'Draft',
    applicants: 0,
    newToday: 0,
    postedDate: '—',
    icon: Briefcase,
    iconBg: 'bg-surface-container-high',
    iconColor: 'text-on-surface-variant'
  },
  {
    id: 4,
    title: 'Growth Marketing Lead',
    department: 'Marketing',
    location: 'London, UK',
    status: 'Closed',
    applicants: 246,
    newToday: 0,
    postedDate: 'Aug 20, 2023',
    icon: TrendingUp,
    iconBg: 'bg-error-container/30',
    iconColor: 'text-error'
  }
];
*/

export default function Jobs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | JobStatus>('All');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutatingJobId, setMutatingJobId] = useState<number | null>(null);

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

  type IconStyle = {
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
  };

  const jobIconStyles: Record<string, IconStyle> = {
    Design: {
      icon: LayoutGrid,
      iconBg: 'bg-primary-container/10',
      iconColor: 'text-primary-container',
    },
    Marketing: {
      icon: TrendingUp,
      iconBg: 'bg-error-container/30',
      iconColor: 'text-error',
    },
    People: {
      icon: Users,
      iconBg: 'bg-secondary-container/30',
      iconColor: 'text-secondary',
    },
  };

  function getJobIconStyle(department: string): IconStyle {
    return jobIconStyles[department] ?? {
      icon: Briefcase,
      iconBg: 'bg-surface-container-high',
      iconColor: 'text-on-surface-variant',
    };
  }

  function formatDateLabel(value: string): string {
    if (!value) {
      return '--';
    }

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  function buildAvatarUrl(seed: string): string {
    return `https://picsum.photos/seed/${encodeURIComponent(seed)}/100/100`;
  }

  const metrics = useMemo(() => {
    const timeToHireSamples = jobs
      .map((job) => job.timeToHireDays)
      .filter((value): value is number => value !== null);

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((job) => job.status === 'Active').length,
      totalApplicants: jobs.reduce((total, job) => total + job.applicants, 0),
      newApplications: jobs.reduce((total, job) => total + job.newToday, 0),
      averageTimeToHireDays:
        timeToHireSamples.length > 0
          ? Math.round(timeToHireSamples.reduce((total, value) => total + value, 0) / timeToHireSamples.length)
          : 0,
    };
  }, [jobs]);

  const departments = useMemo(() => Array.from(new Set(jobs.map((job) => job.department))).sort(), [jobs]);
  const statusOptions: Array<'All' | JobStatus> = ['All', 'Active', 'Draft', 'Closed'];
  const featuredApplications = applications.slice(0, 2);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [job.title, job.department, job.location].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );

    const matchesDepartment =
      selectedDepartment === 'All' || job.department === selectedDepartment;

    const matchesStatus = selectedStatus === 'All' || job.status === selectedStatus;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h1 className="display-md">Job Postings</h1>
          <p className="text-on-surface-variant font-medium">
            Managing CSV-backed jobs via the unified API
          </p>
        </div>
        <Button className="hidden md:flex" asChild>
          <Link to="/create-job">
            <Plus className="w-4 h-4 mr-2" />
            Post New Job
          </Link>
        </Button>
      </header>

      {isLoading && <Card variant="low">Loading jobs…</Card>}
      {error && (
        <Card variant="low" className="text-error">
          {error}
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="lowest" className="shadow-sm">
          <p className="label-md text-[10px] text-on-surface-variant/50 mb-4">Active Jobs</p>
          <div className="flex items-end justify-between">
            <span className="text-5xl font-black text-primary">{metrics.activeJobs}</span>
            <span className="text-primary-container bg-primary-container/10 px-2 py-1 rounded text-[10px] font-bold">
              {metrics.totalJobs} total
            </span>
          </div>
        </Card>
        <Card variant="low">
          <p className="label-md text-[10px] text-on-surface-variant/50 mb-4">Total Applicants</p>
          <div className="flex items-end justify-between">
            <span className="text-5xl font-black text-secondary">
              {metrics.totalApplicants.toLocaleString()}
            </span>
            <div className="flex -space-x-2">
              {featuredApplications.map((application) => (
                <img
                  key={application.id}
                  src={buildAvatarUrl(application.avatarSeed || application.name.toLowerCase().replace(/\s+/g, '-'))}
                  alt={application.name}
                  className="w-8 h-8 rounded-full border-2 border-surface-container-low"
                  referrerPolicy="no-referrer"
                />
              ))}
              <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-surface-container-low flex items-center justify-center text-[10px] font-bold">
                +{Math.max(metrics.totalApplicants - featuredApplications.length, 0)}
              </div>
            </div>
          </div>
        </Card>
        <Card variant="lowest" className="shadow-sm">
          <p className="label-md text-[10px] text-on-surface-variant/50 mb-4">New Applications</p>
          <div className="flex items-end justify-between">
            <span className="text-5xl font-black text-primary">
              {metrics.newApplications}
            </span>
            <TrendingUp className="w-8 h-8 text-primary-container" />
          </div>
        </Card>
        <Card variant="low">
          <p className="label-md text-[10px] text-on-surface-variant/50 mb-4">Time to Hire</p>
          <div className="flex items-end justify-between">
            <span className="text-5xl font-black text-secondary">
              {metrics.averageTimeToHireDays}
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant/50 mb-1">DAYS AVG.</span>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
          <input
            type="text"
            placeholder="Search job titles, keywords, or location..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest rounded-lg border-none shadow-sm focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedDepartment}
            onChange={(event) => setSelectedDepartment(event.target.value)}
            className="bg-surface-container-low border-none rounded-lg py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-primary/10 appearance-none"
          >
            <option value="All">Department: All</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <div className="flex bg-surface-container-low p-1 rounded-full">
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status)}
                className={cn(
                  'px-6 py-3 rounded-full text-sm font-bold transition-all',
                  selectedStatus === status
                    ? 'bg-primary-container text-on-primary'
                    : 'text-on-surface-variant/60 hover:bg-white/50',
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <Card variant="lowest" className="p-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container-low">
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50">Job Title & Department</th>
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50">Status</th>
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50">Applicants</th>
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50">Posted Date</th>
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="group hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      {(() => {
                        const iconStyle = getJobIconStyle(job.department);
                        const Icon = iconStyle.icon;
                        return (
                          <div
                            className={cn(
                              'w-12 h-12 rounded-lg flex items-center justify-center',
                              iconStyle.iconBg,
                              iconStyle.iconColor,
                            )}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                        );
                      })()}
                      <div>
                        <p className="text-lg font-bold group-hover:text-primary transition-colors">{job.title}</p>
                        <p className="text-sm text-on-surface-variant/60">
                          {job.department} / {job.location}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      job.status === 'Active' ? "bg-primary-container/10 text-primary-container" : 
                      job.status === 'Draft' ? "bg-surface-container-high text-on-surface-variant/60" : 
                      "bg-error-container/30 text-error"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", 
                        job.status === 'Active' ? "bg-primary-container" : 
                        job.status === 'Draft' ? "bg-on-surface-variant/40" : 
                        "bg-error"
                      )} />
                      {job.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-primary hover:underline cursor-pointer">
                      {job.applicants.toLocaleString()} Applicants
                    </p>
                    {job.newToday > 0 && (
                      <p className="text-[10px] text-on-surface-variant/40 mt-1">{job.newToday} new today</p>
                    )}
                  </td>
                  <td className="px-8 py-6 text-sm text-on-surface-variant/60 font-medium">
                    {formatDateLabel(job.postedDate)}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 text-on-surface-variant/40 hover:text-primary transition-colors"
                        type="button"
                        disabled={mutatingJobId === job.id}
                        title="Edit (UI placeholder)"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-on-surface-variant/40 hover:text-primary transition-colors"
                        type="button"
                        disabled={mutatingJobId === job.id}
                        title="View applicants (UI placeholder)"
                      >
                        <Users className="w-5 h-5" />
                      </button>
                      {job.status === 'Closed' ? (
                        <button
                          className="p-2 text-on-surface-variant/40 hover:text-primary transition-colors"
                          type="button"
                          disabled={mutatingJobId === job.id}
                          onClick={async () => {
                            try {
                              setMutatingJobId(job.id);
                              const updated = await jobsApi.update(job.id, { status: 'Active' });
                              setJobs((prev) => prev.map((item) => (item.id === job.id ? updated : item)));
                            } catch (err) {
                              setError((err as Error).message);
                            } finally {
                              setMutatingJobId(null);
                            }
                          }}
                          title="Reopen job"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                      ) : job.status === 'Draft' ? (
                        <button
                          className="p-2 text-on-surface-variant/40 hover:text-error transition-colors"
                          type="button"
                          disabled={mutatingJobId === job.id}
                          onClick={async () => {
                            try {
                              setMutatingJobId(job.id);
                              await jobsApi.remove(job.id);
                              setJobs((prev) => prev.filter((item) => item.id !== job.id));
                            } catch (err) {
                              setError((err as Error).message);
                            } finally {
                              setMutatingJobId(null);
                            }
                          }}
                          title="Delete draft"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          className="p-2 text-on-surface-variant/40 hover:text-error transition-colors"
                          type="button"
                          disabled={mutatingJobId === job.id}
                          onClick={async () => {
                            try {
                              setMutatingJobId(job.id);
                              const updated = await jobsApi.update(job.id, { status: 'Closed' });
                              setJobs((prev) => prev.map((item) => (item.id === job.id ? updated : item)));
                            } catch (err) {
                              setError((err as Error).message);
                            } finally {
                              setMutatingJobId(null);
                            }
                          }}
                          title="Close job"
                        >
                          <Ban className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-8 py-6 border-t border-surface-container-low flex items-center justify-between">
          <p className="text-sm text-on-surface-variant/60">
            Showing {filteredJobs.length} of {jobs.length} listings from the CSV-backed API
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="border border-outline-variant/30">Previous</Button>
            <Button variant="secondary" size="sm">Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
