"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { api } from "@/lib/api-client";
import type { Job } from "@/types";

export default function BookmarksPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookmarks();
  }, []);

  async function loadBookmarks() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.jobs.getBookmarked();
      setJobs(data);
    } catch (err) {
      setError("Failed to load bookmarked jobs.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveBookmark(jobId: string) {
    try {
      await api.jobs.removeBookmark(jobId);
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (err) {
      console.error("Failed to remove bookmark:", err);
    }
  }

  function handleApply(jobId: string) {
    router.push(`/apply?jobId=${jobId}`);
  }

  return (
    <>
      <Header />
      <main className="flex-1 px-6 lg:px-20 py-8 gap-10 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">
            Bookmarked Jobs
          </h1>
          <p className="text-on-surface-variant">
            {jobs.length} saved {jobs.length === 1 ? "job" : "jobs"}
          </p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error text-error px-6 py-4 rounded-lg">
            <p>{error}</p>
            <button
              onClick={() => loadBookmarks()}
              className="text-sm font-bold mt-2 hover:underline"
            >
              Try Again
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-on-surface-variant">Loading bookmarked jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-on-surface-variant/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">No bookmarked jobs yet</h3>
            <p className="text-on-surface-variant mb-6 max-w-md">
              Browse available positions and save jobs you're interested in.
            </p>
            <button
              onClick={() => router.push("/jobs")}
              className="px-8 py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
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
                    </div>

                    {job.required_skills && job.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.required_skills.slice(0, 5).map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Match Score Badge */}
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
                    onClick={() => handleRemoveBookmark(job.id)}
                    className="px-4 py-2 border border-error/30 text-error font-bold rounded-lg hover:bg-error/5 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
