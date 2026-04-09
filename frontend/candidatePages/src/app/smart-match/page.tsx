"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { api } from "@/lib/api-client";
import { FALLBACK_JOBS, FALLBACK_MATCHES } from "@/lib/fallback-data";
import type {
  Job,
  MatchRecommendation,
  MatchResult,
  ResumeParseResult,
  ResumeSkillEvidenceRecord,
} from "@/types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = [".pdf", ".docx"] as const;

export default function SmartMatch() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<
    "idle" | "parsing" | "scoring"
  >("idle");
  const [parseResult, setParseResult] = useState<ResumeParseResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    Promise.all([
      api.matches.list({ limit: 6 }),
      api.jobs.list({ sort_by: "relevance", limit: 20 }),
    ])
      .then(([nextMatches, nextJobs]) => {
        setMatches(nextMatches);
        setJobs(nextJobs);
      })
      .catch(() => {
        setMatches(FALLBACK_MATCHES);
        setJobs(FALLBACK_JOBS);
      })
      .finally(() => setLoading(false));
  }, []);

  const jobsById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);

  const sortedMatches = useMemo(
    () => [...matches].sort((left, right) => right.jd_match_score - left.jd_match_score),
    [matches],
  );

  const isBusy = uploadState !== "idle";

  async function handleResumeFile(nextFile: File) {
    setActionError(null);
    setParseResult(null);

    const extension = `.${nextFile.name.split(".").pop() || ""}`.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(extension as (typeof SUPPORTED_EXTENSIONS)[number])) {
      setActionError("Please upload a PDF or DOCX resume.");
      return;
    }

    if (nextFile.size > MAX_FILE_BYTES) {
      setActionError("File is too large. Maximum size is 5MB.");
      return;
    }

    try {
      setUploadState("parsing");
      const result = await api.resume.upload(nextFile, "fresher");

      if (result.parse_result) {
        setParseResult(result.parse_result);
      }

      setUploadState("scoring");
      const resumeId = result.resume_id || result.parse_result?.resume_id;
      if (!resumeId) {
        throw new Error("Upload succeeded but resume_id was missing.");
      }

      const computed = await api.matches.compute(resumeId);
      setMatches(computed);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Resume upload failed. Please try again.";
      setActionError(message);
    } finally {
      setUploadState("idle");
    }
  }

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void handleResumeFile(file);

    // Allow re-uploading the same file.
    event.target.value = "";
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    void handleResumeFile(file);
  }

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">AI-Powered</p>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface mb-4">
            Discover Your Next Perfect Role
          </h1>
          <p className="text-lg text-on-surface-variant max-w-2xl mx-auto">
            Upload your resume and let our AI find the best matching opportunities tailored to your skills and experience.
          </p>
        </div>

        {/* Upload Zone */}
        <div className="mb-14">
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_EXTENSIONS.join(",")}
            onChange={onPickFile}
            className="hidden"
          />

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer outline-none ${
              dragActive
                ? "border-primary/70 bg-primary/5"
                : "border-outline-variant/40 hover:border-primary/50 hover:bg-primary/5"
            }`}
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-primary text-5xl">cloud_upload</span>
            </div>
            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">
              Drag &amp; drop your resume
            </h3>
            <p className="text-sm text-on-surface-variant mb-6">
              or click to browse from your computer
            </p>

            {actionError ? (
              <div className="max-w-xl mx-auto mb-6 bg-error-container text-on-error-container text-sm font-medium px-4 py-3 rounded-2xl border border-error-container/60">
                {actionError}
              </div>
            ) : null}

            {isBusy ? (
              <div className="max-w-xl mx-auto mb-6 bg-surface-container-low text-on-surface-variant text-sm px-4 py-3 rounded-2xl border border-outline-variant/20">
                {uploadState === "parsing"
                  ? "Parsing your resume..."
                  : "Scoring your resume against active jobs..."}
              </div>
            ) : null}

            <div className="flex items-center justify-center gap-3">
              <span className="inline-flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                PDF
              </span>
              <span className="inline-flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">description</span>
                DOCX
              </span>
              <span className="inline-flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">rule</span>
                5MB max
              </span>
            </div>
          </div>
        </div>

        {parseResult ? (
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary text-2xl">badge</span>
              <h2 className="font-headline text-2xl font-extrabold text-on-surface">
                Parsed Resume
              </h2>
              <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                {parseResult.resume_quality?.score != null
                  ? `Quality ${parseResult.resume_quality.score}/100`
                  : "Parsed"}
              </span>
            </div>

            <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Candidate
                  </p>
                  <h3 className="font-headline text-xl font-bold text-on-surface">
                    {parseResult.normalized_resume?.full_name ||
                      parseResult.candidate_name ||
                      "Candidate"}
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    Resume ID: {parseResult.resume_id}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {parseResult.candidate_type ? (
                    <span className="bg-surface-container-high text-on-surface text-xs font-bold px-3 py-1.5 rounded-full">
                      {parseResult.candidate_type.toUpperCase()}
                    </span>
                  ) : null}
                  {parseResult.parser_metadata?.filename ? (
                    <span className="bg-surface-container-high text-on-surface-variant text-xs font-semibold px-3 py-1.5 rounded-full">
                      {parseResult.parser_metadata.filename}
                    </span>
                  ) : null}
                </div>
              </div>

              {parseResult.normalized_resume?.experience_summary ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                    Experience Summary
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {parseResult.normalized_resume.experience_summary}
                  </p>
                </div>
              ) : null}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  Extracted Skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {buildSkillEvidence(parseResult).map(({ skill, evidenceTypes }) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-xl text-xs font-semibold text-on-surface"
                    >
                      {skill}
                      <span className="flex items-center gap-1">
                        {evidenceTypes.map((evidence) => (
                          <span
                            key={`${skill}-${evidence}`}
                            className={evidenceBadgeClass(evidence)}
                          >
                            {evidence}
                          </span>
                        ))}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {parseResult.resume_quality?.breakdown ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3">
                    Resume Quality Breakdown
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(parseResult.resume_quality.breakdown)
                      .filter(([, value]) => typeof value === "number")
                      .map(([key, value]) => {
                        const max = qualityWeightFor(key);
                        const ratio = max > 0 ? Math.min(1, value / max) : 0;

                        return (
                          <div
                            key={key}
                            className="bg-surface-container rounded-2xl p-4 border border-outline-variant/10"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold text-on-surface">
                                {humanizeQualityKey(key)}
                              </p>
                              <p className="text-xs font-bold text-on-surface-variant">
                                {Math.round(value)}/{max || 100}
                              </p>
                            </div>
                            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${Math.round(ratio * 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : null}

              {parseResult.warnings?.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                    Warnings
                  </p>
                  <ul className="space-y-2">
                    {parseResult.warnings.map((warning) => (
                      <li
                        key={warning}
                        className="bg-secondary-container/30 border border-secondary-container/50 rounded-2xl px-4 py-3 text-sm text-on-surface-variant"
                      >
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {parseResult.missing_fields?.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                    Missing Fields
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {parseResult.missing_fields.map((field) => (
                      <span
                        key={field}
                        className="inline-flex items-center gap-1.5 bg-error-container text-on-error-container text-xs font-semibold px-3 py-1.5 rounded-full"
                      >
                        <span className="material-symbols-outlined text-sm">error</span>
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {parseResult.normalized_resume?.education?.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                    Education
                  </p>
                  <div className="space-y-3">
                    {parseResult.normalized_resume.education.map((entry, index) => (
                      <div
                        key={`${entry.institution || "edu"}-${index}`}
                        className="bg-surface-container rounded-2xl p-4 border border-outline-variant/10"
                      >
                        <p className="text-sm font-semibold text-on-surface">
                          {entry.degree || "Education"}
                          {entry.specialization ? ` — ${entry.specialization}` : ""}
                        </p>
                        <p className="text-sm text-on-surface-variant">
                          {entry.institution || ""}
                          {entry.completion_year ? ` • ${entry.completion_year}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {parseResult.normalized_resume?.projects?.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                    Projects
                  </p>
                  <div className="space-y-3">
                    {parseResult.normalized_resume.projects.map((project, index) => (
                      <div
                        key={`${project.title}-${index}`}
                        className="bg-surface-container rounded-2xl p-4 border border-outline-variant/10"
                      >
                        <p className="text-sm font-semibold text-on-surface">
                          {project.title}
                        </p>
                        {project.summary ? (
                          <p className="text-sm text-on-surface-variant mt-1">
                            {project.summary}
                          </p>
                        ) : null}
                        {project.tech_stack?.length ? (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {project.tech_stack.slice(0, 10).map((tech) => (
                              <span
                                key={`${project.title}-${tech}`}
                                className="bg-surface-container-high text-on-surface-variant text-[11px] font-medium px-2.5 py-1 rounded-lg"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Smart Matches Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
            <h2 className="font-headline text-2xl font-extrabold text-on-surface">Smart Matches</h2>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
              {loading ? "Loading..." : `${sortedMatches.length} found`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedMatches.map((match) => {
              const job = jobsById.get(match.jobId);
              const companyName = job?.company_name || match.company_name || "Coastal Seven";
              const location = job?.location || match.location || "Remote";
              const score = match.jd_match_score;

              return (
                <article
                  key={match.id}
                  className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10 hover:shadow-lg hover:border-primary/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-headline text-lg font-extrabold text-on-surface">
                        {match.jobTitle}
                      </h3>
                      <p className="text-sm text-on-surface-variant">
                        {companyName}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-1">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {location}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={scoreBadgeClass(score)}>{score}%</span>
                      <span className={recommendationBadgeClass(match.recommendation)}>
                        {String(match.recommendation)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                        Matched Skills
                      </p>
                      <div className="space-y-2">
                        {(match.matched_skills || []).slice(0, 8).map((skill) => (
                          <div
                            key={`${match.id}-matched-${skill}`}
                            className="flex items-center gap-2 text-sm text-on-surface"
                          >
                            <span className="material-symbols-outlined text-primary text-base">
                              check_circle
                            </span>
                            {skill}
                          </div>
                        ))}
                        {match.matched_skills.length === 0 ? (
                          <p className="text-sm text-on-surface-variant">
                            No matched skills detected yet.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                        Missing Skills
                      </p>
                      <div className="space-y-2">
                        {(match.missing_skills || []).slice(0, 8).map((skill) => (
                          <div
                            key={`${match.id}-missing-${skill}`}
                            className="flex items-center gap-2 text-sm text-on-surface"
                          >
                            <span className="material-symbols-outlined text-error text-base">
                              cancel
                            </span>
                            {skill}
                          </div>
                        ))}
                        {match.missing_skills.length === 0 ? (
                          <p className="text-sm text-on-surface-variant">
                            No missing skills flagged.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {match.summary ? (
                    <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
                      {match.summary}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href="/jobs"
                      className="hero-gradient text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                    >
                      Apply Now
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function buildSkillEvidence(parseResult: ResumeParseResult): Array<{
  skill: string;
  evidenceTypes: string[];
}> {
  const evidence = (parseResult.normalized_resume?.skill_evidence || []) as ResumeSkillEvidenceRecord[];
  const evidenceBySkill = new Map<string, Set<string>>();

  evidence.forEach((record) => {
    const skill = record.skill?.trim();
    const evidenceType = record.evidence_type?.trim();
    if (!skill) {
      return;
    }
    if (!evidenceBySkill.has(skill)) {
      evidenceBySkill.set(skill, new Set());
    }
    if (evidenceType) {
      evidenceBySkill.get(skill)!.add(evidenceType);
    }
  });

  const skills = parseResult.normalized_resume?.skills?.length
    ? parseResult.normalized_resume.skills
    : parseResult.extracted_skills;

  return (skills || []).map((skill) => ({
    skill,
    evidenceTypes: Array.from(evidenceBySkill.get(skill) || []).slice(0, 2),
  }));
}

function evidenceBadgeClass(evidenceType: string): string {
  const normalized = evidenceType.toLowerCase();

  if (normalized === "primary") {
    return "bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full";
  }

  if (normalized === "project") {
    return "bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-0.5 rounded-full";
  }

  if (normalized === "certification") {
    return "bg-tertiary-container text-on-tertiary-container text-[10px] font-bold px-2 py-0.5 rounded-full";
  }

  return "bg-surface-container text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full";
}

function qualityWeightFor(key: string): number {
  if (key === "completeness") return 40;
  if (key === "structure") return 25;
  if (key === "contactability") return 20;
  if (key === "signal_quality") return 15;
  return 100;
}

function humanizeQualityKey(key: string): string {
  if (key === "signal_quality") {
    return "Signal";
  }

  return key
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
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

function recommendationBadgeClass(recommendation: MatchRecommendation): string {
  if (recommendation === "SHORTLIST") {
    return "bg-primary/10 text-primary text-[11px] font-bold px-3 py-1 rounded-full";
  }

  if (recommendation === "REVIEW") {
    return "bg-secondary-container text-on-secondary-container text-[11px] font-bold px-3 py-1 rounded-full";
  }

  return "bg-error-container text-on-error-container text-[11px] font-bold px-3 py-1 rounded-full";
}

