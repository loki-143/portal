import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function ApplicationSuccess() {
  return (
    <>
      <Header />
      <main className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Ambient Background Gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle, #16baad 0%, transparent 70%)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-15" style={{ background: "radial-gradient(circle, #006a62 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 max-w-xl w-full flex flex-col items-center">
          {/* Checkmark with Ripple */}
          <div className="relative mb-8">
            {/* Ripple */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-[-12px] rounded-full bg-primary/10 animate-pulse" />
            {/* Circle */}
            <div className="relative w-28 h-28 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #006a62 0%, #16baad 100%)" }}>
              <span className="material-symbols-outlined text-white text-6xl">check</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-center text-on-surface mb-3">
            Glad you&apos;re joining us!
          </h1>
          <p className="text-lg text-on-surface-variant text-center mb-10 max-w-md">
            Your application has been submitted successfully. We&apos;ll review it and get back to you soon.
          </p>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10">
            {/* Check your inbox */}
            <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-2xl">mail</span>
              </div>
              <h3 className="font-headline font-bold text-on-surface mb-1">Check your inbox</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                We&apos;ve sent a confirmation email with all the details.
              </p>
            </div>

            {/* Share the journey */}
            <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-secondary text-2xl">share</span>
              </div>
              <h3 className="font-headline font-bold text-on-surface mb-1">Share the journey</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Let your network know &mdash; referrals boost visibility by 3x.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/jobs"
              className="px-8 py-3.5 rounded-xl text-sm font-bold text-white text-center hover:opacity-90 transition-opacity editorial-shadow"
              style={{ background: "linear-gradient(135deg, #006a62 0%, #16baad 100%)" }}
            >
              Explore Opportunities
            </Link>
            <Link
              href="/"
              className="px-8 py-3.5 rounded-xl text-sm font-bold text-on-surface text-center bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/20"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Floating Glassmorphism Bar */}
        <div className="relative z-10 mt-12 w-full max-w-md">
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/20 flex items-center justify-between editorial-shadow">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-sm">fingerprint</span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Application ID</p>
                <p className="font-mono text-sm font-bold text-on-surface">CS-2024-00847</p>
              </div>
            </div>
            <button className="p-2 rounded-lg hover:bg-white/50 transition-colors text-on-surface-variant" title="Copy">
              <span className="material-symbols-outlined text-lg">content_copy</span>
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
