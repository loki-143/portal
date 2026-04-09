"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { api } from "@/lib/api-client";
import { FALLBACK_PROGRAMS } from "@/lib/fallback-data";
import type { KnowledgeFactoryProgram } from "@/types";

const DEFAULT_DESCRIPTION =
  "Join an elite ecosystem of innovators. Work on high-impact projects that shape industries, guided by masters of the craft.";

export default function KnowledgeFactoryPage() {
  const [programs, setPrograms] = useState<KnowledgeFactoryProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    api.knowledgeFactory
      .listPrograms({ limit: 5 })
      .then((nextPrograms) => {
        if (isActive) {
          setPrograms(nextPrograms);
        }
      })
      .catch(() => {
        if (isActive) {
          setPrograms(FALLBACK_PROGRAMS);
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
    programs.find((program) => program.status === "Open") || programs[0];
  const heroCopy = featuredProgram
    ? `${featuredProgram.description} ${featuredProgram.name} runs for ${featuredProgram.duration}.`
    : DEFAULT_DESCRIPTION;

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
                  ? `${featuredProgram.status} Enrollment - Deadline ${formatShortDate(featuredProgram.deadline)}`
                  : "Enrollment Open"}
            </span>
            <h1 className="text-on-surface text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-8">
              Want to grow <br />
              with us?
            </h1>
            <p className="text-on-surface-variant text-lg lg:text-xl leading-relaxed mb-12 max-w-lg">
              {loading ? "Loading program details for this cohort..." : heroCopy}
            </p>
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
        <div className="flex-1 bg-surface-container-low px-4 lg:px-20 py-16 lg:py-24 flex items-center justify-center relative">
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
                    ? `Apply for ${featuredProgram.name} by ${formatLongDate(featuredProgram.deadline)}. All fields marked with * are required.`
                    : "Step into your future. All fields marked with * are required."}
              </p>
            </div>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Full Name *
                  </label>
                  <input
                    className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-on-surface placeholder:text-outline-variant transition-all"
                    placeholder="John Doe"
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Email Address *
                  </label>
                  <input
                    className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-on-surface placeholder:text-outline-variant transition-all"
                    placeholder="john@example.com"
                    type="email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Phone Number *
                  </label>
                  <input
                    className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-on-surface placeholder:text-outline-variant transition-all"
                    placeholder="+1 (555) 000-0000"
                    type="tel"
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
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                  LinkedIn Profile (Optional)
                </label>
                <input
                  className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-on-surface placeholder:text-outline-variant transition-all"
                  placeholder="linkedin.com/in/johndoe"
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                  Resume / CV *
                </label>
                <div className="group relative flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 rounded-2xl p-8 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                  <span className="material-symbols-outlined text-outline group-hover:text-primary text-4xl mb-3">
                    cloud_upload
                  </span>
                  <p className="text-sm text-on-surface-variant font-medium">
                    Drag and drop or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-[10px] text-outline mt-1 uppercase">
                    PDF, DOCX up to 10MB
                  </p>
                  <input
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    type="file"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  className="w-full bg-primary text-on-primary font-extrabold py-4 rounded-2xl editorial-shadow hover:translate-y-[-2px] hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  type="submit"
                >
                  Apply Now
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
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

function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatLongDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
