import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Search, Filter, Mail, Phone, Calendar, ChevronDown, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { applicationsApi } from '../services/api';
import type { Application, ApplicationStatus } from '../types';
import { toast } from '../lib/toast';
import { openResumeViewer } from '../utils/resumeViewer';

// Inlined to avoid Vite HMR re-export cache issues
function formatApplicationStatus(status: ApplicationStatus): string {
  const map: Record<string, string> = {
    "Applied": "Applied",
    "Under Review": "Under Review",
    "Shortlisted": "Shortlisted",
    "Interview Scheduled": "Interview Scheduled",
    "Interview Completed": "Interview Completed",
    "Offered": "Offered",
    "Hired": "Hired",
    "Rejected": "Rejected",
    "Withdrawn": "Withdrawn",
  };
  return map[status] || status;
}

function getMatchScoreBg(status: ApplicationStatus): string {
  switch (status) {
    case 'Hired': case 'Shortlisted': return 'bg-green-100 text-green-800';
    case 'Under Review': case 'Interview Scheduled': case 'Interview Completed': return 'bg-yellow-100 text-yellow-800';
    case 'Rejected': case 'Withdrawn': return 'bg-red-100 text-red-800';
    default: return 'bg-blue-100 text-blue-800';
  }
}

const STATUS_OPTIONS: ApplicationStatus[] = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview Scheduled',
  'Interview Completed',
  'Offered',
  'Hired',
  'Rejected',
  'Withdrawn',
];

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadApplications();
  }, [searchQuery, statusFilter, page]);

  async function loadApplications() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await applicationsApi.list({
        status: statusFilter || undefined,
        page,
        limit,
      });

      setApplications(response.applications);
      setTotal(response.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(id: string, status: ApplicationStatus) {
    try {
      await applicationsApi.update(id, { status });
      setApplications(apps =>
        apps.map(a => a.id === id ? { ...a, status } : a)
      );
      toast.success('Status updated', `Application moved to ${formatApplicationStatus(status)}.`);
    } catch (err) {
      toast.error('Failed to update status', (err as Error).message);
      setError((err as Error).message);
    }
  }

  async function computeAIScore(app: Application) {
    const resumeId = (app as any).resume_id;
    if (!resumeId) {
      toast.error('No resume', 'This application does not have a resume to score.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/matches/compute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('portal_token')}`,
        },
        body: JSON.stringify({ resume_id: resumeId }),
      });

      if (!response.ok) throw new Error('Failed to compute score');

      const matches = await response.json();
      const jobMatch = matches.find((m: any) => m.jobId === app.job_id);
      
      if (jobMatch) {
        const aiScore = jobMatch.jd_match_score;
        // Update the application with the AI score
        await applicationsApi.update(app.id, { ai_score: aiScore } as any);
        setApplications(apps =>
          apps.map(a => a.id === app.id ? { ...a, ai_score: aiScore } as any : a)
        );
        toast.success('AI Score computed', `Match score: ${Math.round(aiScore)}%`);
      } else {
        toast.error('No match found', 'Could not compute AI score for this job.');
      }
    } catch (err) {
      toast.error('Failed to compute AI score', (err as Error).message);
    }
  }

  const totalPages = Math.ceil(total / limit);

  const metrics = {
    total,
    applied: applications.filter(a => a.status === 'Applied').length,
    shortlisted: applications.filter(a => a.status === 'Shortlisted').length,
    interview: applications.filter(a => a.status.includes('Interview')).length,
    offered: applications.filter(a => a.status === 'Offered').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="display-md">Applications</h1>
        <p className="text-on-surface-variant font-medium">Review and manage candidate applications for all positions.</p>
      </header>

      {error && (
        <Card variant="low" className="text-error">
          {error}
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card variant="highest">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Total</p>
              <p className="text-2xl font-black">{metrics.total}</p>
            </div>
          </div>
        </Card>
        <Card variant="low">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Applied</p>
              <p className="text-2xl font-black">{metrics.applied}</p>
            </div>
          </div>
        </Card>
        <Card variant="low">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Shortlisted</p>
              <p className="text-2xl font-black">{metrics.shortlisted}</p>
            </div>
          </div>
        </Card>
        <Card variant="low">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Interview</p>
              <p className="text-2xl font-black">{metrics.interview}</p>
            </div>
          </div>
        </Card>
        <Card variant="low">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-on-surface-variant/50">Offered</p>
              <p className="text-2xl font-black">{metrics.offered}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
          <input
            type="text"
            placeholder="Search by candidate name, email, or job title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-surface-container-low border-none rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-surface-container-low border-none rounded-lg px-4 py-3"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Card>

      {/* Applications List */}
      {isLoading ? (
        <Card variant="low" className="text-center py-12">Loading applications...</Card>
      ) : applications.length === 0 ? (
        <Card variant="low" className="text-center py-12">
          <Users className="w-12 h-12 mx-auto mb-4 text-on-surface-variant/30" />
          <h3 className="text-lg font-bold mb-2">No applications yet</h3>
          <p className="text-on-surface-variant">
            Applications will appear here when candidates apply to your jobs.
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {applications.map((app) => {
              const jobTitle = (app.jobs as any)?.title || 'Unknown Job';
              const candidate = (app as any).users;
              const candidateName = candidate ? `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() : 'Candidate';
              const candidateEmail = candidate?.email || app.candidate_id;
              const candidatePhone = candidate?.phone;
              const aiScore = (app as any).ai_score;
              
              return (
                <Card key={app.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-lg">{candidateName}</h3>
                          <p className="text-sm text-on-surface-variant/70">Applied for: {jobTitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {aiScore != null && (
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                              aiScore >= 80 ? 'bg-green-100 text-green-800' :
                              aiScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              AI: {Math.round(aiScore)}%
                            </span>
                          )}
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${getMatchScoreBg(app.status)}`}>
                            {formatApplicationStatus(app.status)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-on-surface-variant/70">
                        {app.cover_letter && (
                          <p className="line-clamp-2">{app.cover_letter.substring(0, 150)}...</p>
                        )}
                      </div>
                      
                      <div className="mt-3 flex items-center gap-4 text-xs text-on-surface-variant/50">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {candidateEmail}
                        </div>
                        {candidatePhone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {candidatePhone}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Applied {new Date(app.applied_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="relative">
                        <select
                          value={app.status}
                          onChange={(e) => updateStatus(app.id, e.target.value as ApplicationStatus)}
                          className="appearance-none bg-surface-container-low border-none rounded-lg pl-4 pr-10 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                      </div>
                      
                      {aiScore == null && (app as any).resume_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => computeAIScore(app)}
                        >
                          Compute AI Score
                        </Button>
                      )}
                      
                      {(app.resume_url || (app as any).resume_id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={async () => {
                            if (app.resume_url) {
                              window.open(app.resume_url, '_blank');
                              return;
                            }
                            
                            const resumeId = (app as any).resume_id;
                            if (!resumeId) return;
                            
                            try {
                              const [resumeResponse, matchResponse] = await Promise.all([
                                fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/resume/${resumeId}`, {
                                  headers: { 'Authorization': `Bearer ${localStorage.getItem('portal_token')}` },
                                }),
                                fetch(`${import.meta.env.VITE_CANDIDATE_PAGES_URL || 'http://localhost:3002/api/v1'}/matches/compute`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('portal_token')}`,
                                  },
                                  body: JSON.stringify({ resume_id: resumeId }),
                                }).catch(() => null),
                              ]);
                              
                              if (!resumeResponse.ok) {
                                const error = await resumeResponse.json();
                                alert(`Unable to load resume: ${error.error?.message || 'Unknown error'}`);
                                return;
                              }
                              
                              const resumeData = await resumeResponse.json();
                              let matchData = null;
                              
                              if (matchResponse && matchResponse.ok) {
                                const matches = await matchResponse.json();
                                matchData = matches.find((m: any) => m.jobId === app.job_id);
                              }
                              
                              openResumeViewer(resumeData, matchData, app);
                            } catch (err) {
                              console.error('Resume viewer error:', err);
                              alert(`Failed to load resume: ${err instanceof Error ? err.message : 'Unknown error'}`);
                            }
                          }}
                        >
                          View Resume
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-on-surface-variant/50">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} applications
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
