"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ApplicationSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const applicationId = searchParams.get("id") || "CS-2024-00847";
  const [copied, setCopied] = useState(false);

  function copyId() {
    navigator.clipboard.writeText(applicationId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Header />
      <main className="flex-1 px-6 lg:px-20 py-12 max-w-2xl mx-auto w-full">
        <div className="text-center space-y-8">
          {/* Animated Checkmark */}
          <div className="w-24 h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div>
            <h1 className="font-headline text-3xl font-bold text-on-surface mb-3">
              Application Submitted!
            </h1>
            <p className="text-lg text-on-surface-variant">
              Your application has been successfully submitted.
            </p>
          </div>

          {/* Application ID */}
          <div className="bg-surface-container-low rounded-xl p-6 inline-block">
            <p className="text-sm text-on-surface-variant mb-2">Application ID</p>
            <div className="flex items-center gap-3">
              <code className="text-xl font-mono font-bold text-primary">
                {applicationId}
              </code>
              <button
                onClick={copyId}
                className="px-3 py-1 text-xs font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Next Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-surface-container-low/50 rounded-xl p-6 border border-outline-variant/10">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-on-surface mb-2">Check your inbox</h3>
              <p className="text-sm text-on-surface-variant">
                We'll send you a confirmation email with next steps.
              </p>
            </div>

            <div className="bg-surface-container-low/50 rounded-xl p-6 border border-outline-variant/10">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-bold text-on-surface mb-2">Track your application</h3>
              <p className="text-sm text-on-surface-variant">
                View status updates in your dashboard.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={() => router.push("/dashboard/candidate")}
              className="px-8 py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push("/jobs")}
              className="px-8 py-3 border border-outline-variant text-on-surface font-bold rounded-lg hover:bg-surface-container-low transition-colors"
            >
              Browse More Jobs
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
