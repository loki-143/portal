import { useEffect, useMemo, useState } from 'react';
import { Filter as FilterIcon, Search, TrendingUp, Zap } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { applicationsApi } from '../services/api';
import type { Application, ApplicationStatus } from '../types';
import { cn } from '../lib/utils';

function buildAvatarUrl(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/100/100`;
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

export default function Applications() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const applicationsResponse = await applicationsApi.list();

        if (cancelled) {
          return;
        }

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

  async function updateStatus(id: number, status: ApplicationStatus) {
    try {
      setMutatingId(id);
      const updated = await applicationsApi.update(id, { status });
      setApplications((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMutatingId(null);
    }
  }

  const roles = useMemo(
    () => Array.from(new Set(applications.map((application) => application.role))).sort(),
    [applications],
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredApplications = applications
    .filter((application) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [application.name, application.email, application.phone].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );

      const matchesRole = selectedRole === 'All' || application.role === selectedRole;

      return matchesSearch && matchesRole;
    })
    .sort((left, right) => {
      if (sortBy === 'status') {
        return left.status.localeCompare(right.status) || right.match - left.match;
      }

      return right.date.localeCompare(left.date);
    });

  const metrics = useMemo(() => {
    const shortlisted = applications.filter((application) => application.status === 'Shortlisted');
    const pending = applications.filter((application) => application.status === 'Pending');
    const rejected = applications.filter((application) => application.status === 'Rejected');

    const averageMatchScore =
      applications.length > 0
        ? Math.round(applications.reduce((total, application) => total + application.match, 0) / applications.length)
        : 0;

    return {
      totalApplications: applications.length,
      shortlistedApplications: shortlisted.length,
      pendingApplications: pending.length,
      rejectedApplications: rejected.length,
      averageMatchScore,
      shortlistRate:
        applications.length > 0 ? Math.round((shortlisted.length / applications.length) * 100) : 0,
    };
  }, [applications]);

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="display-lg">Applications</h1>
          <p className="text-lg text-on-surface-variant font-medium">
            Reviewing CSV-backed applications via the unified API
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm font-black uppercase tracking-[0.2em] text-primary">
          <div className="h-1 w-8 soul-gradient rounded-full" />
          Live Feed
        </div>
      </header>

      {/* Filters */}
      <Card variant="low" className="p-6 flex flex-wrap items-center gap-6">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
          <input
            type="text"
            placeholder="Search candidate names..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full bg-surface-container-lowest border-none rounded-full py-3 pl-12 pr-6 text-sm focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <select
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value)}
            className="bg-surface-container-lowest border-none rounded-full py-3 px-6 text-sm font-medium text-on-surface-variant/60 focus:ring-2 focus:ring-primary/20 appearance-none min-w-[180px]"
          >
            <option value="All">All Job Roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <div className="flex items-center bg-surface-container-lowest rounded-full p-1">
            <button
              type="button"
              onClick={() => setSortBy('date')}
              className={cn(
                'px-4 py-2 text-[10px] font-black uppercase tracking-wider',
                sortBy === 'date'
                  ? 'text-primary'
                  : 'text-on-surface-variant/40 hover:text-on-surface-variant/60',
              )}
            >
              By Date
            </button>
            <button
              type="button"
              onClick={() => setSortBy('status')}
              className={cn(
                'px-4 py-2 text-[10px] font-black uppercase tracking-wider',
                sortBy === 'status'
                  ? 'text-primary'
                  : 'text-on-surface-variant/40 hover:text-on-surface-variant/60',
              )}
            >
              By Status
            </button>
          </div>
          <Button variant="ghost" className="bg-surface-container-lowest shadow-sm">
            <FilterIcon className="w-4 h-4 mr-2" />
            Advanced Filters
          </Button>
        </div>
      </Card>

      {isLoading && <Card variant="low">Loading applications…</Card>}
      {error && (
        <Card variant="low" className="text-error">
          {error}
        </Card>
      )}

      {/* Table */}
      <Card variant="lowest" className="p-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50">Candidate Info</th>
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50">Job Role</th>
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50 text-center">AI Match</th>
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50">Status</th>
                <th className="px-8 py-6 label-md text-[10px] text-on-surface-variant/50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {filteredApplications.map((c) => (
                <tr key={c.id} className="group hover:bg-surface-container-low/30 transition-colors duration-300">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full overflow-hidden bg-surface-container-high">
                        <img
                          src={buildAvatarUrl(c.avatarSeed || c.name.toLowerCase().replace(/\s+/g, '-'))}
                          alt={c.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-on-surface text-base">{c.name}</p>
                        <p className="text-xs text-on-surface-variant/60 font-medium">
                          {c.email} / {c.phone}
                        </p>
                        <p className="text-[10px] text-primary mt-1 font-bold">
                          {formatDateLabel(c.date)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-semibold text-on-surface-variant">{c.role}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-32 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000",
                            c.match > 90 ? "bg-green-500" : c.match > 70 ? "bg-yellow-400" : "bg-error"
                          )} 
                          style={{ width: `${c.match}%` }} 
                        />
                      </div>
                      <span className={cn(
                        "text-xs font-black",
                        c.match > 90 ? "text-green-600" : c.match > 70 ? "text-yellow-600" : "text-error"
                      )}>{c.match}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full",
                      c.status === 'Shortlisted' ? "bg-green-50 text-green-700" : 
                      c.status === 'Pending' ? "bg-surface-container-high text-on-surface-variant/60" : 
                      "bg-error-container/30 text-error"
                    )}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="bg-surface-container-high">View Resume</Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(c.id, 'Shortlisted')}
                        disabled={mutatingId === c.id}
                      >
                        Shortlist
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-error hover:bg-error/5"
                        onClick={() => updateStatus(c.id, 'Rejected')}
                        disabled={mutatingId === c.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-8 py-6 flex items-center justify-between bg-surface-container-low/30">
          <span className="text-xs font-medium text-on-surface-variant/60">
            Showing {filteredApplications.length} of {applications.length} applications from the CSV-backed API
          </span>
          <Button variant="ghost" size="sm" className="bg-surface-container-lowest">
            CSV Seed Data
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card variant="low" className="bg-gradient-to-br from-white to-surface-container-low border-none">
          <p className="label-md text-[10px] text-primary mb-2">Total Volume</p>
          <p className="text-4xl font-black">{metrics.totalApplications}</p>
          <div className="mt-4 flex items-center gap-2 text-green-600 font-bold text-xs">
            <TrendingUp className="w-4 h-4" />
            {metrics.pendingApplications} awaiting review
          </div>
        </Card>
        <Card variant="low" className="bg-gradient-to-br from-white to-surface-container-low border-none">
          <p className="label-md text-[10px] text-primary mb-2">Avg. AI Score</p>
          <p className="text-4xl font-black">{metrics.averageMatchScore}%</p>
          <div className="mt-4 flex items-center gap-2 text-primary font-bold text-xs">
            <Zap className="w-4 h-4" />
            Across current CSV entries
          </div>
        </Card>
        <Card variant="low" className="bg-gradient-to-br from-white to-surface-container-low border-none">
          <p className="label-md text-[10px] text-primary mb-2">Shortlist Rate</p>
          <p className="text-4xl font-black">{metrics.shortlistRate}%</p>
          <div className="mt-4 flex items-center gap-2 text-on-surface-variant/60 font-bold text-xs">
            <FilterIcon className="w-4 h-4" />
            {metrics.shortlistedApplications} shortlisted candidates
          </div>
        </Card>
      </div>
    </div>
  );
}
