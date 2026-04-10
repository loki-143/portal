"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { authApi, resumeApi, profileApi } from "@/lib/api-client";

type Step = "account" | "resume";

export default function RegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("account");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Resume step
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      await authApi.register({
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || undefined,
        role: "candidate",
      });
      setStep("resume");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResumeUpload() {
    if (!resumeFile) return;
    setUploading(true);
    setError(null);
    try {
      const result = await resumeApi.upload(resumeFile);
      // Save resume_id and parsed details to profile
      const normalized = result.parse_result?.normalized_resume;
      await profileApi.update({
        resume_id: result.resume_id,
        skills: result.parse_result?.extracted_skills || [],
        headline: normalized?.current_role || undefined,
        location: normalized?.current_location || undefined,
        phone: normalized?.phones?.[0] || phone.trim() || undefined,
        education: normalized?.education?.map((e) => ({
          institution: e.institution || "",
          degree: e.degree || "",
          field_of_study: e.specialization || "",
          graduation_year: e.completion_year || 0,
        })) || [],
      } as any);
      setUploadDone(true);
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

  function handleSkip() {
    router.push("/dashboard/candidate");
  }

  function handleContinue() {
    router.push("/dashboard/candidate");
  }

  if (step === "resume") {
    return (
      <>
        <Header />
        <main className="flex-1 px-6 lg:px-20 py-12 max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">Upload Your Resume</h1>
            <p className="text-on-surface-variant">
              We'll parse it to fill your profile automatically. This helps recruiters find you faster.
            </p>
          </div>

          {error && (
            <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
          )}

          {uploadDone ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
                ✓ Resume uploaded and profile updated successfully.
              </div>
              <button
                onClick={handleContinue}
                className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-outline-variant rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {resumeFile ? (
                  <p className="font-bold text-primary">{resumeFile.name}</p>
                ) : (
                  <>
                    <p className="font-bold text-on-surface mb-1">Click to select your resume</p>
                    <p className="text-sm text-on-surface-variant">PDF or DOCX, max 5MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              />

              <button
                onClick={handleResumeUpload}
                disabled={!resumeFile || uploading}
                className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading & Parsing..." : "Upload Resume"}
              </button>

              <button
                onClick={handleSkip}
                className="w-full py-3 border border-outline-variant text-on-surface font-bold rounded-lg hover:bg-surface-container-low transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 px-6 lg:px-20 py-12 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">Create Account</h1>
          <p className="text-on-surface-variant">Join Coastal Seven to find your next opportunity</p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        <form onSubmit={handleAccountSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="block text-sm font-bold text-on-surface">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-bold text-on-surface">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-on-surface">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-on-surface">
              Phone <span className="text-on-surface-variant/50">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
              autoComplete="tel"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-on-surface">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-on-surface">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline">Sign in</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
