"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { api } from "@/lib/api-client";
import {
  FALLBACK_APPLICATIONS,
  FALLBACK_MATCHES,
  FALLBACK_MATCH_INSIGHTS,
  FALLBACK_PROFILE,
} from "@/lib/fallback-data";
import type {
  Application,
  ApplicationStatus,
  CandidateProfile,
  MatchInsights,
  MatchResult,
  ResumeDetails,
} from "@/types";
import Link from "next/link";

const navItems = [
  { label: "Overview", icon: "dashboard", active: true },
  { label: "My Applications", icon: "description", active: false },
  { label: "Profile Settings", icon: "settings", active: false },
  { label: "AI Insights", icon: "auto_awesome", active: false },
];

const DEFAULT_AVATAR_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAXX6y0nXXhqpTtopyxU3r5y0bPWE5bh7RErSBZk6ZAtgCinn0oj9sV-6IZIdLdvu1zxi8u3qOFBdLZoUXtirZawRC5JsuUUTZiZUoXeCxRiOvnka-fRRTud52FUvc5D7DOCzVGYxEHAPiT1kClan_qr-u-rwsnXky4wPoeBhK6yc4SH2BflXVWRuF080r6-Wv7G2SGbH4";

export default function CandidateDashboard() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [insights, setInsights] = useState<MatchInsights | null>(null);
  const [resumeDetails, setResumeDetails] = useState<ResumeDetails | null>(null);
  const [resumeRequestError, setResumeRequestError] = useState<
    { resumeId: string; message: string } | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    Promise.allSettled([
      api.profile.get(),
      api.applications.listMine({ limit: 5 }),
      api.matches.list({ limit: 20 }),
      api.matches.getInsights(),
    ])
      .then(([profileResult, applicationsResult, matchesResult, insightsResult]) => {
        if (!isActive) {
          return;
        }

        setProfile(
          profileResult.status === "fulfilled"
            ? profileResult.value
            : FALLBACK_PROFILE,
        );
        setApplications(
          applicationsResult.status === "fulfilled"
            ? applicationsResult.value
            : FALLBACK_APPLICATIONS,
        );
        setMatches(
          matchesResult.status === "fulfilled"
            ? matchesResult.value
            : FALLBACK_MATCHES,
        );
        setInsights(
          insightsResult.status === "fulfilled"
            ? insightsResult.value
            : FALLBACK_MATCH_INSIGHTS,
        );
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const resumeId = profile?.resume_id;

    if (!resumeId) {
      return;
    }

    api.resume
      .getById(resumeId)
      .then((result) => {
        if (isActive) {
          setResumeDetails(result);
          setResumeRequestError(null);
        }
      })
      .catch((error) => {
        if (isActive) {
          setResumeDetails(null);
          setResumeRequestError({
            resumeId,
            message:
              error instanceof Error
                ? error.message
                : "Unable to load resume details.",
          });
        }
      })
      .finally(() => undefined);

    return () => {
      isActive = false;
    };
  }, [profile?.resume_id]);

  const currentResumeId = profile?.resume_id;
  const resumeErrorForCurrent =
    currentResumeId && resumeRequestError?.resumeId === currentResumeId
      ? resumeRequestError
      : null;
  const resolvedResumeDetails =
    currentResumeId && resumeDetails?.resume_id === currentResumeId
      ? resumeDetails
      : null;
  const resumeLoading =
    Boolean(currentResumeId) && !resolvedResumeDetails && !resumeErrorForCurrent;

  const displayProfile = profile || FALLBACK_PROFILE;
  const sortedApplications = [...applications].sort(compareApplications);
  const activeApplication = sortedApplications[0];
  const otherApplications = sortedApplications.slice(1, 3);
  const progressSteps = buildProgressSteps(activeApplication?.status);
  const topMatch = matches[0];
  const matchByJobId = new Map(matches.map((match) => [match.jobId, match]));
  const activeApplicationMatch = activeApplication
    ? matchByJobId.get(activeApplication.job_id)
    : undefined;
  const primaryTip =
    insights?.improvement_tips[0]?.tip ||
    FALLBACK_MATCH_INSIGHTS.improvement_tips[0]?.tip ||
    "Complete your skills assessment to boost your AI match accuracy.";
  const name = [displayProfile.first_name, displayProfile.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-8">
          {/* Left Sidebar */}
          <aside className="w-[280px] shrink-0 space-y-6">
            {/* Welcome Card */}
            <div className="bg-surface-container-low rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={displayProfile.avatar_url || DEFAULT_AVATAR_URL}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
                />
                <div>
                  <p className="font-headline font-bold text-on-surface">
                    Welcome back,
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {loading ? "Syncing your profile..." : name || "Candidate"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {loading
                  ? "Refreshing your applications and AI insights."
                  : `${applications.length} tracked applications and ${matches.length} AI matches are ready.`}
              </p>
            </div>

            {/* Navigation */}
            <nav className="bg-surface-container-low rounded-2xl p-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href="#"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Pro Tip */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">
                  lightbulb
                </span>
                <div>
                  <p className="font-headline font-bold text-sm text-on-surface mb-1">
                    Pro Tip
                  </p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {loading
                      ? "Analyzing where your profile can improve next."
                      : primaryTip}
                  </p>
                  {!loading && topMatch ? (
                    <p className="text-[11px] text-primary mt-2 font-medium">
                      Top match: {topMatch.jobTitle} at{" "}
                      {topMatch.company_name || "Coastal Careers"} (
                      {topMatch.jd_match_score}%)
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          {/* Center Content */}
          <section className="flex-1 space-y-6">
            {/* Resume Summary */}
            <div className="bg-surface-container-low rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">
                  description
                </span>
                <h3 className="font-headline font-bold text-on-surface">
                  Resume Summary
                </h3>
              </div>

              {profile?.resume_id && resumeLoading ? (
                <p className="text-sm text-on-surface-variant">
                  Loading your parsed resume...
                </p>
              ) : profile?.resume_id && resolvedResumeDetails ? (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-headline font-bold text-on-surface">
                        {resolvedResumeDetails.normalized_resume.full_name || name || "Candidate"}
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        Updated {formatDate(resolvedResumeDetails.updated_at)}
                      </p>
                    </div>
                    <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
                      Quality {resolvedResumeDetails.resume_quality.score}/100
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                      Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {resolvedResumeDetails.normalized_resume.skills.slice(0, 16).map((skill) => (
                        <span
                          key={skill}
                          className="bg-surface-container-high text-on-surface-variant text-xs font-semibold px-3 py-1.5 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {resolvedResumeDetails.normalized_resume.skills.length === 0 ? (
                        <span className="text-sm text-on-surface-variant">
                          No skills extracted yet.
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : profile?.resume_id ? (
                <p className="text-sm text-on-surface-variant">
                  We couldn&apos;t load your resume details right now.
                </p>
              ) : (
                <p className="text-sm text-on-surface-variant">
                  Upload a resume on Smart Match to see a summary here.
                </p>
              )}
            </div>

            {/* Active Application */}
            <div className="bg-surface-container-low rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Active Application
                  </p>
                  <h2 className="font-headline text-xl font-bold text-on-surface">
                    {loading
                      ? "Loading your latest application..."
                      : activeApplication?.job_title || "No active applications yet"}
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    {loading
                      ? "Fetching company and status details"
                      : activeApplication
                        ? `${activeApplication.company_name || "Coastal Careers"} - ${activeApplication.location || "Remote"}`
                        : "Explore roles to start building your pipeline"}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                    activeApplication
                      ? getStatusBadgeClass(activeApplication.status)
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {loading
                    ? "Syncing"
                    : activeApplication?.status || "No Applications"}
                </span>
              </div>

              {activeApplication && activeApplicationMatch ? (
                <div className="mb-5 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    AI Match
                  </span>
                  <span className={scoreBadgeClass(activeApplicationMatch.jd_match_score)}>
                    {activeApplicationMatch.jd_match_score}%
                  </span>
                </div>
              ) : null}

              {/* Progress Timeline */}
              <div className="flex items-center justify-between mb-2">
                {progressSteps.map((step, index) => (
                  <div key={step.label} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          step.done
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {step.done ? (
                          <span className="material-symbols-outlined text-lg">
                            check
                          </span>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-on-surface-variant mt-2 text-center">
                        {step.label}
                      </p>
                    </div>
                    {index < progressSteps.length - 1 ? (
                      <div
                        className={`flex-1 h-0.5 mx-1 mt-[-18px] ${
                          step.done ? "bg-primary" : "bg-outline-variant/30"
                        }`}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Other Applications */}
            <div>
              <h3 className="font-headline font-bold text-on-surface mb-4">
                Other Applications
              </h3>
              <div className="space-y-3">
                {loading ? (
                  <div className="bg-surface-container-low rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <p className="font-headline font-semibold text-on-surface">
                        Loading applications...
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        Pulling your latest statuses
                      </p>
                    </div>
                  </div>
                ) : otherApplications.length > 0 ? (
                  otherApplications.map((application) => {
                    const applicationMatch = matchByJobId.get(application.job_id);

                    return (
                      <div
                        key={application.id}
                        className="bg-surface-container-low rounded-2xl p-5 flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div>
                          <p className="font-headline font-semibold text-on-surface">
                            {application.job_title || "Application"}
                          </p>
                          <p className="text-sm text-on-surface-variant">
                            {application.company_name || "Coastal Careers"}
                          </p>
                          {applicationMatch ? (
                            <p className="text-xs text-on-surface-variant mt-1">
                              AI match {applicationMatch.jd_match_score}%
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {applicationMatch ? (
                            <span className={scoreBadgeClass(applicationMatch.jd_match_score)}>
                              {applicationMatch.jd_match_score}%
                            </span>
                          ) : null}
                          <span
                            className={`text-xs font-bold px-3 py-1.5 rounded-full ${getStatusBadgeClass(application.status)}`}
                          >
                            {application.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-surface-container-low rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <p className="font-headline font-semibold text-on-surface">
                        No other applications yet
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        Your next submission will appear here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Right Sidebar */}
          <aside className="w-[320px] shrink-0 space-y-6">
            {/* AI Match Insights */}
            <div className="bg-surface-container-low rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-primary">
                  auto_awesome
                </span>
                <h3 className="font-headline font-bold text-on-surface">
                  AI Match Insights
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <MatchRing
                  color="var(--color-primary)"
                  label="Skills Match"
                  value={
                    loading
                      ? 0
                      : insights?.skills_match_percentage ||
                        FALLBACK_MATCH_INSIGHTS.skills_match_percentage
                  }
                  loading={loading}
                />
                <MatchRing
                  color="var(--color-secondary)"
                  label="Exp Match"
                  value={
                    loading
                      ? 0
                      : insights?.experience_match_percentage ||
                        FALLBACK_MATCH_INSIGHTS.experience_match_percentage
                  }
                  loading={loading}
                />
              </div>

              {/* Improvement Tip */}
              <div className="bg-tertiary-container/30 border border-tertiary-container/50 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-tertiary text-xl shrink-0">
                    trending_up
                  </span>
                  <div>
                    <p className="font-headline font-bold text-xs text-on-surface mb-1">
                      Improvement Tip
                    </p>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {loading
                        ? "Calculating the fastest way to raise your score."
                        : primaryTip}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Interviews */}
            <div className="bg-surface-container-low rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">
                  event
                </span>
                <h3 className="font-headline font-bold text-on-surface">
                  Upcoming Interviews
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-surface-container rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">
                      videocam
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">
                      {loading
                        ? "Syncing next milestone..."
                        : activeApplication?.company_name ||
                          topMatch?.company_name ||
                          "Coastal Careers"}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {loading
                        ? "Checking your latest recruiter updates"
                        : activeApplication?.status === "Interview"
                          ? "Interview stage reached"
                          : activeApplication
                            ? `${activeApplication.status} - next update pending`
                            : "No interview scheduled yet"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

function scoreBadgeClass(score: number): string {
  if (score >= 80) {
    return "bg-primary-container/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full";
  }

  if (score >= 60) {
    return "bg-secondary-container text-on-secondary-container text-xs font-bold px-3 py-1.5 rounded-full";
  }

  return "bg-error-container text-on-error-container text-xs font-bold px-3 py-1.5 rounded-full";
}

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MatchRing({
  color,
  label,
  value,
  loading,
}: {
  color: string;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="var(--color-surface-container)"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${(value / 100) * 213.6} ${213.6}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-headline text-lg font-extrabold text-on-surface">
          {loading ? "..." : `${value}%`}
        </span>
      </div>
      <p className="text-xs font-medium text-on-surface-variant mt-2">
        {label}
      </p>
    </div>
  );
}

function compareApplications(left: Application, right: Application): number {
  const statusDifference =
    getStatusRank(right.status) - getStatusRank(left.status);

  if (statusDifference !== 0) {
    return statusDifference;
  }

  return Date.parse(right.applied_at || "") - Date.parse(left.applied_at || "");
}

function buildProgressSteps(status?: ApplicationStatus) {
  const currentRank = status ? getStatusRank(status) : -1;
  const labels = ["Applied", "Review", "Shortlisted", "Interview", "Decision"];

  return labels.map((label, index) => ({
    label,
    done: index <= currentRank,
  }));
}

function getStatusRank(status: ApplicationStatus): number {
  const order: ApplicationStatus[] = [
    "Applied",
    "Under Review",
    "Shortlisted",
    "Interview",
    "Decision",
  ];

  return order.indexOf(status);
}

function getStatusBadgeClass(status: ApplicationStatus): string {
  if (status === "Shortlisted" || status === "Interview") {
    return "bg-primary-container/20 text-primary";
  }

  if (status === "Under Review") {
    return "bg-secondary-container text-on-secondary-container";
  }

  if (status === "Decision") {
    return "bg-surface-container-high text-on-surface";
  }

  return "bg-tertiary-container text-on-tertiary-container";
}
