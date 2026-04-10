import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Search, Briefcase, MapPin, Clock, Users, ChevronLeft, ChevronRight, Eye, Edit2, XCircle, X } from 'lucide-react';
import { jobsApi } from '../services/api';
import type { Job, JobStatus } from '../types';
import { toast } from '../lib/toast';

// Inlined to avoid Vite HMR re-export cache issues
function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return "Not specified";
  const formatNum = (n: number) => `₹${(n / 100000).toFixed(1)}L`;
  if (min && max) return `${formatNum(min)} - ${formatNum(max)}`;
  if (min) return `From ${formatNum(min)}`;
  if (max) return `Up to ${formatNum(max)}`;
  return "Not specified";
}

export default function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadJobs();
  }, [debouncedQuery, departmentFilter, typeFilter, statusFilter, page]);

  async function loadJobs() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await jobsApi.list({
        q: debouncedQuery,
        department: departmentFilter || undefined,
        job_type: typeFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit,
      });

      setJobs(response.jobs);
      setTotal(response.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateJobStatus(id: string, status: JobStatus) {
    try {
      await jobsApi.update(id, { status });
      setJobs(jobs.map(j => j.id === id ? { ...j, status } : j));
      toast.success(
        status === 'active' ? 'Job activated' : 'Job closed',
        status === 'active' ? 'The job is now visible to candidates.' : 'The job has been closed.'
      );
    } catch (err) {
      toast.error('Failed to update job', (err as Error).message);
      setError((err as Error).message);
    }
  }

  async function deleteJob(id: string) {
    if (!confirm('Are you sure you want to close this job?')) return;
    try {
      await jobsApi.remove(id);
      setJobs(jobs.filter(j => j.id !== id));
      toast.success('Job closed', 'The job has been successfully closed.');
    } catch (err) {
      toast.error('Failed to close job', (err as Error).message);
      setError((err as Error).message);
    }
  }

  function clearAllFilters() {
    setSearchQuery('');
    setDebouncedQuery('');
    setDepartmentFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setPage(1);
  }

  const hasActiveFilters = debouncedQuery || departmentFilter || typeFilter || statusFilter;
  const totalPages = Math.ceil(total / limit);

  // Extract unique values from current job list for filter dropdowns
  const departments = useMemo(() => 
    Array.from(new Set(jobs.map(j => j.department).filter(Boolean))),
    [jobs]
  );
  const types = useMemo(() => 
    Array.from(new Set(jobs.map(j => j.type).filter(Boolean))),
    [jobs]
  );

  const metrics = {
    total,
    active: jobs.filter(j => j.status === 'active').length,
    draft: jobs.filter(j => j.status === 'draft').length,
    closed: jobs.filter(j => j.status === 'closed').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h1 className="display-md">Jobs</h1>
          <p className="text-on-surface-variant font-medium">Manage your open positions and track hiring progress.</p>
        </div>
        <Link to="/create-job">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Job
          </Button>
        </Link>
      </header>

      {error && (
        <Card variant="low" className="text-error">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline text-sm">Dismiss</button>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="highest">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Total Jobs</p>
              <p className="text-2xl font-black">{metrics.total}</p>
            </div>
          </div>
        </Card>
        <Card variant="high">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Active</p>
              <p className="text-2xl font-black">{metrics.active}</p>
            </div>
          </div>
        </Card>
        <Card variant="low">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Draft</p>
              <p className="text-2xl font-black">{metrics.draft}</p>
            </div>
          </div>
        </Card>
        <Card variant="lowest">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Closed</p>
              <p className="text-2xl font-black">{metrics.closed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
            <input
              type="text"
              placeholder="Search jobs by title, description, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          {departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="bg-surface-container-low border-none rounded-lg px-4 py-3 min-w-[180px]"
            >
              <option value="">All Departments</option>
              {departments.map(dept => dept && <option key={dept} value={dept}>{dept}</option>)}
            </select>
          )}

          {/* Type Filter */}
          {types.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-surface-container-low border-none rounded-lg px-4 py-3 min-w-[160px]"
            >
              <option value="">All Types</option>
              {types.map(type => type && <option key={type} value={type}>{type}</option>)}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-surface-container-low border-none rounded-lg px-4 py-3 min-w-[150px]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
            <p className="text-sm text-on-surface-variant/70">
              {total} {total === 1 ? 'job' : 'jobs'} found
              {hasActiveFilters && ' matching your filters'}
            </p>
            <button
              onClick={clearAllFilters}
              className="text-sm text-primary font-bold hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear All Filters
            </button>
          </div>
        )}
      </Card>

      {/* Jobs Table */}
      {isLoading ? (
        <Card variant="low" className="text-center py-12">
          <div className="animate-pulse">
            <div className="h-4 bg-surface-container-high rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-surface-container-high rounded w-1/2 mx-auto"></div>
          </div>
        </Card>
      ) : jobs.length === 0 ? (
        <Card variant="low" className="text-center py-12">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-on-surface-variant/30" />
          <h3 className="text-lg font-bold mb-2">No jobs found</h3>
          <p className="text-on-surface-variant mb-4">
            {hasActiveFilters
              ? 'Try adjusting your filters.'
              : 'Get started by creating your first job.'}
          </p>
          {!hasActiveFilters && (
            <Link to="/create-job">
              <Button>Create Job</Button>
            </Link>
          )}
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearAllFilters}>
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="text-left py-4 px-4 text-xs font-bold text-on-surface-variant/50 uppercase tracking-wider">Title</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-on-surface-variant/50 uppercase tracking-wider">Department</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-on-surface-variant/50 uppercase tracking-wider">Type</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-on-surface-variant/50 uppercase tracking-wider">Location</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-on-surface-variant/50 uppercase tracking-wider">Salary</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-on-surface-variant/50 uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-on-surface-variant/50 uppercase tracking-wider">Posted</th>
                  <th className="text-right py-4 px-4 text-xs font-bold text-on-surface-variant/50 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low/50">
                    <td className="py-4 px-4">
                      <p className="font-bold">{job.title}</p>
                      {job.company_name && <p className="text-xs text-on-surface-variant/50">{job.company_name}</p>}
                    </td>
                    <td className="py-4 px-4 text-sm">{job.department || '-'}</td>
                    <td className="py-4 px-4 text-sm">
                      {job.type && (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-surface-container-high">
                          {job.type}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location || 'Remote'}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm">{formatSalary(job.salary_min, job.salary_max)}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                        job.status === 'active' ? 'bg-green-100 text-green-800' :
                        job.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm">{new Date(job.posted_at).toLocaleDateString()}</td>
                    <td className="py-4 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/applications`)}
                          title="View applicants"
                        >
                          <Users className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/create-job`)}
                          title="Edit job"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        {job.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateJobStatus(job.id, 'closed')}
                            title="Close job"
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        )}
                        {job.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateJobStatus(job.id, 'active')}
                            title="Activate job"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-on-surface-variant/50">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} jobs
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
