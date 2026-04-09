import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="z-10">
              <h1 className="font-headline text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-[-0.03em] mb-6 text-on-surface">
                Find the right job faster. <br />
                <span className="text-primary">Get hired smarter.</span>
              </h1>
              <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed max-w-xl mb-10">
                Our advanced AI matches your skills to top-tier internship and
                lateral opportunities in real-time. Experience the future of
                recruitment.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/smart-match"
                  className="hero-gradient text-on-primary px-8 py-4 rounded-xl font-bold text-base editorial-shadow hover:scale-[1.02] transition-transform"
                >
                  Apply Now
                </Link>
                <Link
                  href="/jobs"
                  className="border-2 border-outline-variant/30 text-primary px-8 py-4 rounded-xl font-bold text-base hover:bg-surface-container-low transition-colors"
                >
                  Explore Jobs
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden editorial-shadow bg-surface-container-high border border-outline-variant/20">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZxmGMxwz8UMn8boobeK1YWuxXfVIjIVEmCTjDwYuZzEdfwX4PHXxDBnDHGiX2BQdauhTOrRstJjzHnpl1SNemC46Fw1sSB3kB7Iyb1FwZuwScuqb5FsdI7rrm9a9R8mEcXsSV9uQLN5oKSGLijxGDEslZoHZ2SCaJhyw6IeEJsnjo6F9dL9wk3_Fpd2g_W9iJJBem7n5wu5UwSmtZqV_2U3zvJ2rj7F-HQa-W1sNkYXcKBVOW4XtoatceVd9LgzuHx-1GaFna76U"
                  alt="Premium clean UI dashboard mock with sleek data visualizations, minimalist glass job cards, and soft teal AI matching indicators"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/10 blur-[100px] rounded-full" />
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-12 bg-surface-container-lowest border-y border-outline-variant/10">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-label font-bold text-xs uppercase tracking-widest text-outline mb-10">
              Trusted by Global Innovators
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale">
              <img
                alt="Google"
                className="h-6"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAk_zAmQVv5BchoZN2uFGRox6TYZtqoyxvUw-C_UtcNEXZqO_BY9j1kVNUqPrZtKa2m-EMmXOKpRrU2m4qfGqGm2DodOzbt-PQMAhzixPywpaTr-2WSrVMXHPnFeYAMLYCV_MkOv0rMbFSspSbJ6Xj5g-LQ7NfDtO7EURjWCdo9pmEUAP5XJpBER76khc5l3ajPeMQ5Nif1J8iED3VT265KwnirUzAFz1ngbMJxdXphAIBRq1pKTkzDcaDHiDSj-NkT4l_lsMIuCCc"
              />
              <img
                alt="Amazon"
                className="h-6"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgCTKFQkUqlrgPJ1RtK9FfgQYv9CAjrjd220QMBghLq6D3nTzoymFV4bePHgUCGYvOu8AFflcjlDrxObh1FPEkRHoprcKnT2aOHa7E2yoVXHvL0hsvT6rYxFVrrdb0Sd_VC4XpD4bhCk4AZzLYWAdkn04JXISvX1oEraAvB45gv9xcJs2Xggo8MA_NZgnc6EYG979QlafP8hO7pTfeaKyocsy_Xj0WWZRDr_ziL6z83M-cjKb3s0yowJzKb376A1y8H_nzG4Dj68Q"
              />
              <img
                alt="Microsoft"
                className="h-6"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEmgTlN49h_mQrKaEyBshEbNjqdftRsTU3OvdI2nD07OKbGjmBRwhFT_JWkRWUlA2XP94dpZKTnYk41K06Arf_0b_2d7GBzbUJ5h8MJmmXUz-BYKdOIAIGExZ7CXYYZPx1PtYumcqlDSJkiQ3GmjYoJXN5XTcdOO62jaCucdYgIOStYEKsPPF4XvRzznudNAR_WoNpS0i4MKsbYQFQeHJgqRen19MW2ylf58CsQObzk1sQq_yhE5Dp2m77z7a9r1bRApwdLimB9RU"
              />
              <img
                alt="Apple"
                className="h-6"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkXlWY5vP9O_n_rbUJltqzIBSYUqyFLENJwDiXYhrT0fNbtvs_0O4M_0wW5Q-iy1WlP260Iw1r5DtWIzu7Jel0Z4Yc17XUzTavouyt9ziFhbYg7FnWxnq1O9ANsINaArLw8Oi-pJHhZFIvOiiBJzUbKYh9RpbC7WJUk_2Xb3MyNR1GcNN8oVq_KHHKmzWfh9uo2ZAyXQuZxrnn5w2U9_6QBpJ-wRlHb4BFMncO9zUkmFoCHr0helooPnP6wIWLWRvdnbrKw69haQ8"
              />
              <img
                alt="Netflix"
                className="h-6"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDutUs6MjaXZnYrBR1N-Fi8z25LUpuuFPKvS6KdT6mY5W73-qvZgbHNHyaaz23ymj0AJEj-izlwLgUO7wCNxogAXFGtblrxg_nk3uJgkd8eXhe2P-JDxEtTaJrYRLyNeWUJzFO-0WllbI_6UAMl4xfQYx4wRmtoHLng-zmpTFZPVHkOrk14suYnOjs7_TsQULBQwWuI1Tch0v0SiRAyYn2k9QQYIBAkJyBV-SzzlJ9vby7eV7kVoGwwgYzuUcBPlhCFlJ3H5LYA8oA"
              />
            </div>
          </div>
        </section>

        {/* Success Stats */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-surface-container-low p-10 rounded-2xl text-center border border-outline-variant/5">
                <div className="text-primary font-headline text-5xl font-extrabold mb-2">
                  98%
                </div>
                <p className="text-on-surface-variant font-medium">
                  Success Rate
                </p>
              </div>
              <div className="bg-surface-container-low p-10 rounded-2xl text-center border border-outline-variant/5">
                <div className="text-primary font-headline text-5xl font-extrabold mb-2">
                  12k+
                </div>
                <p className="text-on-surface-variant font-medium">
                  Active Opportunities
                </p>
              </div>
              <div className="bg-surface-container-low p-10 rounded-2xl text-center border border-outline-variant/5">
                <div className="text-primary font-headline text-5xl font-extrabold mb-2">
                  2.5k
                </div>
                <p className="text-on-surface-variant font-medium">
                  Monthly Hires
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-32 bg-surface">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-20">
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-6 text-on-surface">
                How it works
              </h2>
              <p className="text-on-surface-variant text-lg">
                Our streamlined process removes friction and focuses on what
                matters: your potential.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
              {/* Step 1 */}
              <div className="relative group">
                <div className="mb-8 w-16 h-16 rounded-2xl bg-primary-fixed flex items-center justify-center editorial-shadow">
                  <span className="material-symbols-outlined text-primary text-3xl">
                    file_upload
                  </span>
                </div>
                <h3 className="font-headline text-2xl font-extrabold mb-4 text-on-surface">
                  Upload Resume
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Upload your profile in seconds. Our parser extracts deep
                  technical insights beyond just keywords.
                </p>
                <div className="hidden md:block absolute top-8 left-full w-full h-[2px] bg-outline-variant/20 -z-10" />
              </div>
              {/* Step 2 */}
              <div className="relative group">
                <div className="mb-8 w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center editorial-shadow">
                  <span className="material-symbols-outlined text-secondary text-3xl">
                    psychology
                  </span>
                </div>
                <h3 className="font-headline text-2xl font-extrabold mb-4 text-on-surface">
                  AI Match
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Our proprietary AI scans thousands of live roles to find the
                  perfect cultural and technical fit for you.
                </p>
                <div className="hidden md:block absolute top-8 left-full w-full h-[2px] bg-outline-variant/20 -z-10" />
              </div>
              {/* Step 3 */}
              <div className="relative group">
                <div className="mb-8 w-16 h-16 rounded-2xl bg-primary flex items-center justify-center editorial-shadow">
                  <span className="material-symbols-outlined text-on-primary text-3xl">
                    check_circle
                  </span>
                </div>
                <h3 className="font-headline text-2xl font-extrabold mb-4 text-on-surface">
                  Get Hired
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Direct pipeline to decision-makers. Skip the noise and secure
                  your dream position with confidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Key Benefits */}
        <section className="py-32 bg-surface-container-low">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-6 text-on-surface">
                Designed for Excellence
              </h2>
              <p className="text-on-surface-variant text-lg">
                We&apos;ve reimagined the job search to be data-driven, fair,
                and exceptionally fast.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Benefit 1 */}
              <div className="bg-surface-container-lowest p-12 rounded-3xl border border-outline-variant/10 editorial-shadow hover:-translate-y-1 transition-all">
                <div className="text-primary-container mb-6">
                  <span
                    className="material-symbols-outlined text-4xl"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    target
                  </span>
                </div>
                <h4 className="font-headline text-2xl font-extrabold mb-4 text-on-surface">
                  AI Precision
                </h4>
                <p className="text-on-surface-variant leading-relaxed">
                  Go beyond simple search. Our AI understands the nuance of your
                  experience and matches it to high-growth roles.
                </p>
              </div>
              {/* Benefit 2 */}
              <div className="bg-surface-container-lowest p-12 rounded-3xl border border-outline-variant/10 editorial-shadow hover:-translate-y-1 transition-all">
                <div className="text-primary-container mb-6">
                  <span
                    className="material-symbols-outlined text-4xl"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    balance
                  </span>
                </div>
                <h4 className="font-headline text-2xl font-extrabold mb-4 text-on-surface">
                  Fair Evaluation
                </h4>
                <p className="text-on-surface-variant leading-relaxed">
                  Eliminate unconscious bias. CareerAI focuses strictly on skills
                  and potential to ensure equal opportunity.
                </p>
              </div>
              {/* Benefit 3 */}
              <div className="bg-surface-container-lowest p-12 rounded-3xl border border-outline-variant/10 editorial-shadow hover:-translate-y-1 transition-all">
                <div className="text-primary-container mb-6">
                  <span
                    className="material-symbols-outlined text-4xl"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    bolt
                  </span>
                </div>
                <h4 className="font-headline text-2xl font-extrabold mb-4 text-on-surface">
                  Instant Feedback
                </h4>
                <p className="text-on-surface-variant leading-relaxed">
                  No more &quot;black holes.&quot; Receive immediate insights on
                  your match probability and areas for improvement.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="hero-gradient rounded-[2rem] p-12 md:p-24 relative overflow-hidden text-center editorial-shadow">
              <div className="relative z-10">
                <h2 className="font-headline text-4xl md:text-6xl font-extrabold text-on-primary mb-8 tracking-tight">
                  Ready to transform your career?
                </h2>
                <p className="text-on-primary/80 text-xl max-w-2xl mx-auto mb-12">
                  Join 50,000+ professionals who discovered their next move
                  through AI-powered matching.
                </p>
                <div className="flex flex-wrap justify-center gap-6">
                  <Link
                    href="/smart-match"
                    className="bg-on-primary text-primary px-10 py-5 rounded-xl font-bold text-lg hover:bg-surface-container-lowest transition-colors"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    href="/jobs"
                    className="border-2 border-on-primary text-on-primary px-10 py-5 rounded-xl font-bold text-lg hover:bg-on-primary/10 transition-colors"
                  >
                    View Open Roles
                  </Link>
                </div>
              </div>
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg
                  className="w-full h-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                >
                  <path
                    d="M0 0 L100 100 M0 100 L100 0"
                    stroke="currentColor"
                    strokeWidth="0.5"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
