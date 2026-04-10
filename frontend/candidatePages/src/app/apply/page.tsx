"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { api, resumeApi, profileApi } from "@/lib/api-client";
import type { Job, CandidateProfile } from "@/types";

export default function ApplyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("jobId");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [job, setJob] = useState<Job | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [coverLetter, setCoverLetter] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeId, setResumeId] = useState<string | undefined>();
  const [resumeFileName, setResumeFileName] = useState<string | undefined>();

  useEffect(() => {
    if (!jobId) {
      setError("No job specified.");
      setLoading(false);
      return;
    }

    Promise.all([
      api.jobs.getById(jobId),
      profileApi.get().catch(() => null),
    ]).then(([jobData, profileData]) => {
      setJob(jobData);
      if (profileData) {
        setProfile(profileData);
        if (profileData.portfolio_url) setPortfolioUrl(profileData.portfolio_url);
        if (profileData.resume_id) {
          setResumeId(profileData.resume_id);
          setResumeFileName("Resume on file");
        }
      }
      setLoading(false);
    }).catch(() => {
      setError("Failed to load job details.");
      setLoading(false);
    });
  }, [jobId]);

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const result = await resumeApi.upload(file);
      setResumeId(result.resume_id);
      setResumeFileName(file.name);
      // Also update profile with new resume_id
      if (profile) {
        await profileApi.update({ resume_id: result.resume_id } as any);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload resume";
      
      // Provide helpful guidance for image-based PDFs
      if (errorMessage.includes("Image-based") || errorMessage.includes("scanned")) {
        setError(
          "This resume appears to be a scanned image or image-based PDF. " +
          "Please upload a text-based PDF or DOCX file. " +
          "You can convert your resume using online tools or recreate it in Word/Google Docs."
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId) return;

    setSubmitting(true);
    setError(null);

    try {
      let aiScore: number | undefined;

      // Compute AI score if we have a resume_id
      if (resumeId && job) {
        try {
          const scoreResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/matches/compute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('coastal-careers.access-token')}`,
            },
            body: JSON.stringify({ resume_id: resumeId }),
          });

          if (scoreResponse.ok) {
            const matches = await scoreResponse.json();
            const jobMatch = matches.find((m: any) => m.jobId === jobId);
            if (jobMatch) {
              aiScore = jobMatch.jd_match_score;
            }
          }
        } catch (err) {
          console.warn('Failed to compute AI score:', err);
          // Continue with application even if scoring fails
        }
      }

      const application = await api.applications.submit({
        job_id: jobId,
        cover_letter: coverLetter.trim() || undefined,
        portfolio_url: portfolioUrl.trim() || undefined,
        resume_url: resumeUrl.trim() || undefined,
        resume_id: resumeId,
        ai_score: aiScore,
      } as any);

      router.push(`/application-success?id=${application.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 px-6 lg:px-20 py-12 max-w-3xl mx-auto w-full">
          <div className="text-center py-20">
            <p className="text-on-surface-variant">Loading application form...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error && !job) {
    return (
      <>
        <Header />
        <main className="flex-1 px-6 lg:px-20 py-12 max-w-3xl mx-auto w-full">
          <div className="bg-error/10 border border-error text-error px-6 py-4 rounded-lg">
            <p className="font-bold mb-2">Error</p>
            <p>{error}</p>
            <button onClick={() => router.push("/jobs")} className="text-sm font-bold mt-4 hover:underline">
              ← Back to Jobs
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 px-6 lg:px-20 py-12 max-w-3xl mx-auto w-full">
        <button onClick={() => router.back()} className="text-sm text-on-surface-variant hover:text-primary mb-6 transition-colors">
          ← Back to Jobs
        </button>

        <div className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">Apply for {job?.title}</h1>
          {job?.company_name && <p className="text-on-surface-variant">{job.company_name}</p>}
        </div>

        {/* Candidate info summary */}
        {profile && (
          <div className="bg-surface-container-low rounded-xl p-5 mb-8 border border-outline-variant/20">
            <p className="text-sm font-bold text-on-surface mb-1">Applying as</p>
            <p className="font-bold text-lg">{profile.first_name} {profile.last_name}</p>
            <p className="text-sm text-on-surface-variant">{profile.email}</p>
            {profile.phone && <p className="text-sm text-on-surface-variant">{profile.phone}</p>}
            {profile.headline && <p className="text-sm text-on-surface-variant mt-1">{profile.headline}</p>}
          </div>
        )}

        {error && (
          <div className="bg-error/10 border border-error text-error px-6 py-4 rounded-lg mb-6">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Resume */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-on-surface">Resume</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-bold hover:bg-surface-container-low transition-colors disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Resume (PDF/DOCX)"}
              </button>
              {resumeFileName && (
                <span className="text-sm text-primary font-bold">✓ {resumeFileName}</span>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleResumeUpload} />
            {!resumeId && (
              <div className="space-y-2">
                <p className="text-xs text-on-surface-variant/70">Or paste a link to your resume:</p>
                <input
                  type="url"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Cover Letter */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-on-surface">
              Cover Letter <span className="text-on-surface-variant/50">(optional)</span>
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={8}
              placeholder="Tell us why you're a great fit for this role..."
              className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
          </div>

          {/* Portfolio URL */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-on-surface">
              Portfolio / GitHub URL <span className="text-on-surface-variant/50">(optional)</span>
            </label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="px-8 py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-8 py-3 border border-outline-variant text-on-surface font-bold rounded-lg hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}
