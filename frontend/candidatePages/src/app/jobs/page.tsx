"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { api } from "@/lib/api-client";
import { FALLBACK_JOBS } from "@/lib/fallback-data";
import type { Job } from "@/types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.jobs
      .list({ sort_by: "relevance", limit: 20 })
      .then(setJobs)
      .catch(() => setJobs(FALLBACK_JOBS))
      .finally(() => setLoading(false));
  }, []);

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
              Personalize your journey
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">
                Location
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    checked
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                    type="checkbox"
                    readOnly
                  />
                  <span className="text-sm text-on-surface group-hover:text-primary transition-colors">
                    Remote
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                    type="checkbox"
                    readOnly
                  />
                  <span className="text-sm text-on-surface group-hover:text-primary transition-colors">
                    San Francisco, CA
                  </span>
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">
                Role Type
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    checked
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                    type="checkbox"
                    readOnly
                  />
                  <span className="text-sm text-on-surface group-hover:text-primary transition-colors">
                    Engineering
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                    type="checkbox"
                    readOnly
                  />
                  <span className="text-sm text-on-surface group-hover:text-primary transition-colors">
                    Design
                  </span>
                </label>
              </div>
            </div>
          </div>
          <div className="mt-auto p-6 rounded-2xl hero-gradient text-on-primary">
            <span
              className="material-symbols-outlined mb-2"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              psychology
            </span>
            <h4 className="font-headline font-bold text-base mb-1">
              AI Recommendation
            </h4>
            <p className="text-xs opacity-90 leading-relaxed">
              {loading
                ? "Refreshing your latest opportunity matches."
                : `Our AI found ${jobs.filter((job) => (job.match_score || 0) >= 80).length} strong matches for your profile.`}
            </p>
            <button className="mt-4 w-full py-2 bg-on-primary text-primary font-bold text-xs rounded-lg uppercase tracking-wider">
              View All
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <section className="flex-1 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">
                Explore Opportunities
              </h1>
              <p className="text-on-surface-variant mt-1">
                {loading
                  ? "Loading curated jobs for your profile..."
                  : `Showing ${jobs.length} jobs curated for your profile`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-outline">Sort by:</span>
              <button className="flex items-center gap-1 text-sm font-bold text-primary">
                AI Relevance{" "}
                <span className="material-symbols-outlined text-sm">
                  expand_more
                </span>
              </button>
            </div>
          </div>

          {/* Job Cards */}
          <div className="grid grid-cols-1 gap-6">
            {jobs.map((job) => {
              const matchScore = job.match_score || 0;
              const matchHighlight = matchScore >= 90;

              return (
                <article
                  key={job.id}
                  className="bg-surface-container-lowest p-6 md:p-8 rounded-3xl border border-outline-variant/10 hover:shadow-xl transition-all group relative"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-3xl">
                          {job.icon}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="font-headline text-xl font-bold group-hover:text-primary transition-colors text-on-surface">
                            {job.title}
                          </h2>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              matchHighlight
                                ? "bg-primary-fixed/20 text-primary-fixed-dim border border-primary-fixed/30"
                                : "bg-surface-container-high text-on-surface-variant"
                            }`}
                          >
                            AI MATCH {matchScore > 0 ? `${matchScore}%` : "NEW"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-on-surface-variant font-medium">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">
                              location_on
                            </span>
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">
                              schedule
                            </span>
                            {job.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">
                              payments
                            </span>
                            {job.salary}
                          </span>
                        </div>
                        <p className="mt-4 text-on-surface-variant leading-relaxed max-w-2xl">
                          {job.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex md:flex-col items-center justify-end gap-3 shrink-0">
                      <button className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-xl hover:shadow-lg transition-all hover:-translate-y-0.5">
                        Apply Now
                      </button>
                      <button className="p-2.5 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container transition-colors">
                        <span className="material-symbols-outlined">
                          bookmark_add
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-12 flex justify-center">
            <button className="px-10 py-4 bg-surface-container-low text-primary font-bold rounded-2xl hover:bg-surface-container-high transition-colors flex items-center gap-2">
              Discover More Opportunities
              <span className="material-symbols-outlined">expand_more</span>
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

