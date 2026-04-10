"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { api } from "@/lib/api-client";
import type { KnowledgeFactoryProgram } from "@/types";

const DEFAULT_DESCRIPTION =
  "Join an elite ecosystem of innovators. Work on high-impact projects that shape industries, guided by masters of the craft.";

export default function KnowledgeFactoryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [programs, setPrograms] = useState<KnowledgeFactoryProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [statementOfPurpose, setStatementOfPurpose] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isActive = true;

    api.knowledgeFactory
      .listPrograms({ limit: 10 })
      .then((nextPrograms) => {
        if (isActive) {
          setPrograms(nextPrograms);
          const openProgram = nextPrograms.find((p: any) => p.enrollment_status === "open") || nextPrograms[0];
          if (openProgram) {
            setSelectedProgramId(openProgram.id);
          }
        }
      })
      .catch(() => {
        if (isActive) {
          // Use fallback programs if API fails
          setPrograms([]);
        }
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

  const featuredProgram =
    programs.find((program) => (program as any).enrollment_status === "open") || programs[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!selectedProgramId) {
      setError("Please select a program to apply to.");
      return;
    }

    if (!university.trim()) {
      setError("University is required.");
      return;
    }

    if (university.trim().length < 3) {
      setError("University name must be at least 3 characters.");
      return;
    }

    if (!statementOfPurpose.trim()) {
      setError("Statement of Purpose is required.");
      return;
    }

    if (statementOfPurpose.trim().length < 50) {
      setError("Statement of Purpose must be at least 50 characters.");
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (phone.trim() && !/^[\d\s\-\+\(\)]+$/.test(phone.trim())) {
      setError("Please enter a valid phone number.");
      return;
    }

    if (linkedinUrl.trim() && !linkedinUrl.includes('linkedin.com')) {
      setError("Please enter a valid LinkedIn URL.");
      return;
    }

    setSubmitting(true);

    try {
      // If there's a resume file, upload it first
      let resumeUrl: string | undefined;
      if (resumeFile) {
        // TODO: Upload resume to storage and get URL
        // For now, we'll just store the filename as a placeholder
        resumeUrl = resumeFile.name;
      }

      await api.knowledgeFactory.apply(selectedProgramId, {
        full_name: fullName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        university: university.trim(),
        linkedin_url: linkedinUrl.trim() || undefined,
        resume_url: resumeUrl,
        statement_of_purpose: statementOfPurpose.trim(),
      });

      setSuccess(true);

      // Reset form
      setFullName("");
      setEmail("");
      setPhone("");
      setUniversity("");
      setLinkedinUrl("");
      setResumeFile(null);
      setStatementOfPurpose("");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Application failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "pdf" && ext !== "docx") {
        setError("Only PDF and DOCX files are allowed.");
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be under 5MB.");
        return;
      }
      setResumeFile(file);
      setError(null);
    }
  }

  if (success) {
    return (
      <>
        <Header />
        <main className="flex-1 px-6 lg:px-20 py-12 max-w-2xl mx-auto w-full">
          <div className="text-center space-y-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h1 className="font-headline text-3xl font-bold text-on-surface mb-3">
                Application Submitted!
              </h1>
              <p className="text-lg text-on-surface-variant">
                Your application to {featuredProgram?.name || "the program"} has been received.
              </p>
            </div>

            <div className="bg-surface-container-low rounded-xl p-6 text-left space-y-3">
              <h3 className="font-bold text-on-surface">What happens next?</h3>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  We'll review your application within 5-7 business days.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  You'll receive an email notification with the decision.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  Shortlisted candidates may be invited for an interview.
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                onClick={() => router.push("/dashboard/candidate")}
                className="px-8 py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setSelectedProgramId(programs[0]?.id || "");
                }}
                className="px-8 py-3 border border-outline-variant text-on-surface font-bold rounded-lg hover:bg-surface-container-low transition-colors"
              >
                Apply to Another Program
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Content */}
        <div className="flex-1 px-8 lg:px-20 py-16 lg:py-24 flex flex-col justify-center relative">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary-container/20 text-on-primary-fixed-variant text-[10px] font-bold uppercase tracking-widest rounded-full mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {loading
                ? "Loading Open Cohorts"
                : featuredProgram
                  ? `${(featuredProgram as any).enrollment_status === "open" ? "Open" : "Closed"} Enrollment`
                  : "Enrollment Open"}
            </span>
            <h1 className="text-on-surface text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-8">
              Want to grow <br />
              with us?
            </h1>
            <p className="text-on-surface-variant text-lg lg:text-xl leading-relaxed mb-12 max-w-lg">
              {loading ? "Loading program details..." : (featuredProgram?.description || DEFAULT_DESCRIPTION)}
            </p>

            {/* Program Selector */}
            {!loading && programs.length > 1 && (
              <div className="space-y-3 mb-8">
                <label className="text-sm font-bold text-on-surface">Select Program</label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name} - {program.duration}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative mt-auto w-full aspect-[16/9] rounded-2xl overflow-hidden bg-surface-container shadow-inner group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <div className="relative w-full h-full border border-primary/20 rounded-xl flex items-center justify-center overflow-hidden">
                  <div className="absolute w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                  <div className="grid grid-cols-4 gap-4 w-3/4">
                    <div className="h-24 bg-primary/20 rounded-lg" />
                    <div className="h-32 bg-primary/40 rounded-lg -mt-4" />
                    <div className="h-20 bg-primary/60 rounded-lg mt-4" />
                    <div className="h-28 bg-primary/30 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Application Form */}
        <div className="flex-1 bg-surface-container-low px-4 lg:px-20 py-16 lg:py-24 flex items-center justify-center relative overflow-y-auto">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-[2rem] p-8 lg:p-12 editorial-shadow relative z-10">
            <div className="mb-10">
              <h2 className="text-2xl font-extrabold text-on-surface mb-2">
                Application Form
              </h2>
              <p className="text-on-surface-variant text-sm">
                {loading
                  ? "Loading the latest program details..."
                  : featuredProgram
                    ? `Apply for ${featuredProgram.name}. All fields marked with * are required.`
                    : "Step into your future. All fields marked with * are required."}
              </p>
            </div>

            {error && (
              <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg mb-6 text-sm">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Full Name
                  </label>
                  <input
                    className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-on-surface placeholder:text-outline-variant transition-all"
                    placeholder="John Doe"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Email Address
                  </label>
                  <input
                    className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-on-surface placeholder:text-outline-variant transition-all"
                    placeholder="john@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Phone Number
                  </label>
                  <input
                    className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-on-surface placeholder:text-outline-variant transition-all"
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    University *
                  </label>
                  <input
                    className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-on-surface placeholder:text-outline-variant transition-all"
                    placeholder="Harvard University"
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                  LinkedIn Profile
                </label>
                <input
                  className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-on-surface placeholder:text-outline-variant transition-all"
                  placeholder="linkedin.com/in/johndoe"
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
              </div>

              {/* Resume Upload */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                  Resume / CV
                </label>
                <div
                  className="group relative flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 rounded-2xl p-8 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                  onClick={() => !resumeFile && fileInputRef.current?.click()}
                >
                  {resumeFile ? (
                    <div className="text-center">
                      <span className="material-symbols-outlined text-primary text-4xl mb-3">
                        description
                      </span>
                      <p className="text-sm text-on-surface font-medium">
                        {resumeFile.name}
                      </p>
                      <p className="text-xs text-on-surface-variant/70 mt-1">
                        {(resumeFile.size / 1024).toFixed(0)} KB
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResumeFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="text-xs text-error mt-2 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-outline group-hover:text-primary text-4xl mb-3">
                        cloud_upload
                      </span>
                      <p className="text-sm text-on-surface-variant font-medium">
                        Drag and drop or <span className="text-primary">browse</span>
                      </p>
                      <p className="text-[10px] text-outline mt-1 uppercase">
                        PDF, DOCX up to 5MB
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    className="hidden"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Statement of Purpose */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Statement of Purpose *
                  </label>
                  <span className={`text-xs ${statementOfPurpose.length < 50 ? 'text-error' : 'text-on-surface-variant'}`}>
                    {statementOfPurpose.length} / 50 min
                  </span>
                </div>
                <textarea
                  className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-on-surface placeholder:text-outline-variant transition-all resize-none"
                  placeholder="Tell us about your goals, motivations, and what you hope to achieve..."
                  rows={5}
                  value={statementOfPurpose}
                  onChange={(e) => setStatementOfPurpose(e.target.value)}
                  required
                />
                {statementOfPurpose.length > 0 && statementOfPurpose.length < 50 && (
                  <p className="text-xs text-error">
                    Please write at least 50 characters
                  </p>
                )}
              </div>

              <div className="pt-4">
                <button
                  className="w-full bg-primary text-on-primary font-extrabold py-4 rounded-2xl editorial-shadow hover:translate-y-[-2px] hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  type="submit"
                  disabled={submitting || !university.trim() || university.trim().length < 3 || !statementOfPurpose.trim() || statementOfPurpose.trim().length < 50}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Apply Now
                      <span className="material-symbols-outlined">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-outline mt-4 leading-relaxed">
                  By applying, you agree to our{" "}
                  <a href="#" className="underline underline-offset-2">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="underline underline-offset-2">
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
