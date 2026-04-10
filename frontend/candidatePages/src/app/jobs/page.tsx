"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { api } from "@/lib/api-client";
import type { Job } from "@/types";
import { toast } from "@/lib/toast";

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedJobs, setBookmarkedJobs] = useState<Set<string>>(new Set());
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    loadJobs();
  }, [searchQuery, locationFilter, typeFilter, remoteOnly, sortBy, page]);

  async function loadJobs() {
    try {
      setLoading(true);
      setError(null);

      // Build the API URL correctly
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1";
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (locationFilter) params.set("location", locationFilter);
      if (typeFilter) params.set("job_type", typeFilter);
      if (remoteOnly) params.set("remote_only", "true");
      if (sortBy) params.set("sort_by", sortBy);
      params.set("page", String(page));
      params.set("limit", String(limit));
      
      const url = `${baseUrl}/jobs?${params.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to load jobs");
      }

      setJobs(data.jobs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError("Failed to load jobs. Please try again.");
      console.error(err);
      setJobs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  function handleApply(jobId: string) {
    router.push(`/apply?jobId=${jobId}`);
  }

  async function handleBookmark(jobId: string) {
    try {
      if (bookmarkedJobs.has(jobId)) {
        await api.jobs.removeBookmark(jobId);
        setBookmarkedJobs(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
        toast.success('Bookmark removed', 'Job removed from your bookmarks.');
      } else {
        await api.jobs.bookmark(jobId);
        setBookmarkedJobs(prev => new Set(prev).add(jobId));
        toast.success('Job bookmarked', 'You can find it in your bookmarks page.');
      }
    } catch (err) {
      toast.error('Failed to bookmark', 'Please try again later.');
      console.error("Failed to bookmark job:", err);
    }
  }

  const totalPages = Math.ceil(total / limit);
  const uniqueLocations = Array.from(new Set((jobs || []).map(j => j?.location).filter(Boolean)));

  return (
    <>
      <Header />
      <main className="flex flex-1 px-6 lg:px-20 py-8 gap-10 max-w-7xl mx-auto w-full">
        {/* Sidebar Filters */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 gap-8">
          <div className="flex flex-col gap-2">
            <h3 className="font-headline text-lg font-bold text-on-surface">
              Filters
            </h3>
            <p className="text-sm text-on-surface-variant">
              Find your perfect role
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Search */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">
                Search
              </label>
              <input
                type="text"
                placeholder="Job title, keyword..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Location */}
            {uniqueLocations.length > 0 && (
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold uppercase tracking-widest text-outline">
                  Location
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">All Locations</option>
                  {uniqueLocations.map(loc => loc && (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Job Type */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">
                Job Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            {/* Remote Only */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">
                Options
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  checked={remoteOnly}
                  onChange={(e) => {
                    setRemoteOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                  type="checkbox"
                />
                <span className="text-sm text-on-surface group-hover:text-primary transition-colors">
                  Remote Only
                </span>
              </label>
            </div>

            {/* Sort */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="date">Newest First</option>
                <option value="salary">Highest Salary</option>
              </select>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchQuery("");
                setLocationFilter("");
                setTypeFilter("");
                setRemoteOnly(false);
                setSortBy("date");
                setPage(1);
              }}
              className="text-sm text-primary hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        </aside>

        {/* Job Listings */}
        <section className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-headline text-3xl font-bold text-on-surface">
                Open Positions
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                {total} {total === 1 ? "job" : "jobs"} found
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-on-surface-variant">Loading jobs...</p>
            </div>
          ) : error ? (
            <div className="bg-error/10 border border-error text-error px-6 py-4 rounded-lg">
              <p>{error}</p>
              <button
                onClick={() => loadJobs()}
                className="text-sm font-bold mt-2 hover:underline"
              >
                Try Again
              </button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-on-surface-variant/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">No jobs found</h3>
              <p className="text-on-surface-variant mb-4">
                Try adjusting your filters or search terms.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setLocationFilter("");
                  setTypeFilter("");
                  setRemoteOnly(false);
                }}
                className="text-primary font-bold hover:underline"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-6">
                {jobs.map((job) => (
                  <article
                    key={job.id}
                    className="bg-surface-container-low rounded-xl p-6 lg:p-8 border border-outline-variant/10 hover:border-primary/30 transition-all hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <h2 className="font-headline text-xl font-bold text-on-surface mb-2">
                          {job.title}
                        </h2>
                        
                        {job.company_name && (
                          <p className="text-sm text-on-surface-variant mb-3">
                            {job.company_name}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant mb-4">
                          {job.location && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {job.location}
                            </div>
                          )}
                          {job.type && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {job.type}
                            </div>
                          )}
                          {(job.salary_min || job.salary_max) && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {job.salary_min && job.salary_max
                                ? `₹${(job.salary_min / 100000).toFixed(1)}L - ₹${(job.salary_max / 100000).toFixed(1)}L`
                                : job.salary_min
                                ? `From ₹${(job.salary_min / 100000).toFixed(1)}L`
                                : `Up to ₹${(job.salary_max! / 100000).toFixed(1)}L`}
                            </div>
                          )}
                        </div>

                        {job.description && (
                          <p className="text-sm text-on-surface-variant line-clamp-3 mb-4">
                            {job.description}
                          </p>
                        )}

                        {job.required_skills && job.required_skills.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {job.required_skills.slice(0, 5).map((skill: string) => (
                              <span
                                key={skill}
                                className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.required_skills.length > 5 && (
                              <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs font-bold rounded-full">
                                +{job.required_skills.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Match Score Badge - if available */}
                      {job.match_score !== undefined && job.match_score > 0 && (
                        <div className={`shrink-0 w-16 h-16 rounded-full flex items-center justify-center font-black text-lg ${
                          job.match_score >= 80 ? 'bg-green-100 text-green-700' :
                          job.match_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {Math.round(job.match_score)}%
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-6 pt-6 border-t border-outline-variant/20">
                      <button
                        onClick={() => handleApply(job.id)}
                        className="px-6 py-2 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Apply Now
                      </button>
                      <button
                        onClick={() => handleBookmark(job.id)}
                        className={`px-4 py-2 border font-bold rounded-lg transition-colors ${
                          bookmarkedJobs.has(job.id)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        <svg className="w-5 h-5" fill={bookmarkedJobs.has(job.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => router.push(`/jobs/${job.id}`)}
                        className="ml-auto text-sm text-primary font-bold hover:underline"
                      >
                        View Details →
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-lg border border-outline-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-low transition-colors"
                  >
                    ← Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg font-bold transition-colors ${
                          page === pageNum
                            ? 'bg-primary text-on-primary'
                            : 'border border-outline-variant hover:bg-surface-container-low'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 rounded-lg border border-outline-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-low transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
