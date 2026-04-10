"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { api } from "@/lib/api-client";
import type { Application } from "@/types";

export default function MyApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.applications.listMine({ limit: 100 });
      setApplications(data);
    } catch (err) {
      setError("Failed to load applications.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "Shortlisted":
      case "Interview":
        return "bg-green-100 text-green-800";
      case "Under Review":
        return "bg-yellow-100 text-yellow-800";
      case "Applied":
        return "bg-blue-100 text-blue-800";
      case "Decision":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 px-6 lg:px-20 py-8 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">
            My Applications
          </h1>
          <p className="text-on-surface-variant">
            Track all your job applications in one place
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-on-surface-variant">Loading applications...</p>
          </div>
        ) : error ? (
          <div className="bg-error/10 border border-error text-error px-6 py-4 rounded-lg">
            <p>{error}</p>
            <button
              onClick={() => loadApplications()}
              className="text-sm font-bold mt-2 hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-on-surface-variant/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">No applications yet</h3>
            <p className="text-on-surface-variant mb-6">
              Start applying to jobs to track your progress here.
            </p>
            <button
              onClick={() => router.push("/jobs")}
              className="px-6 py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/10 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-headline text-lg font-bold text-on-surface mb-1">
                          {app.job_title || "Job Application"}
                        </h3>
                        {app.company_name && (
                          <p className="text-sm text-on-surface-variant">
                            {app.company_name}
                            {app.location && ` • ${app.location}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(app as any).ai_score != null && (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            (app as any).ai_score >= 80 ? 'bg-green-100 text-green-800' :
                            (app as any).ai_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            AI: {Math.round((app as any).ai_score)}%
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                    </div>

                    {app.cover_letter && (
                      <p className="text-sm text-on-surface-variant mb-3 line-clamp-2">
                        {app.cover_letter}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-on-surface-variant/70">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Applied {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "recently"}
                      </div>
                      {app.portfolio_url && (
                        <a
                          href={app.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Portfolio
                        </a>
                      )}
                      {app.resume_url && (
                        <a
                          href={app.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Resume
                        </a>
                      )}
                    </div>

                    {/* Timeline */}
                    {app.timeline && app.timeline.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-outline-variant/20">
                        <p className="text-xs font-bold text-on-surface-variant mb-2">Timeline</p>
                        <div className="space-y-1">
                          {app.timeline.slice(0, 3).map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-on-surface-variant/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                              <span className="font-medium">{entry.status}</span>
                              <span>•</span>
                              <span>{new Date(entry.changed_at).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
