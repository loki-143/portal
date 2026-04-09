import Link from "next/link";

export default function Header() {
  return (
    <header className="glass-nav sticky top-0 z-50 border-b border-outline-variant/15">
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-primary">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z"
              fill="currentColor"
            />
          </svg>
          <span className="font-headline text-xl font-extrabold tracking-tight text-on-surface">
            Coastal Seven
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-10">
          <Link
            href="/"
            className="text-sm font-medium hover:text-primary transition-colors text-on-surface-variant"
          >
            Home
          </Link>
          <Link
            href="/jobs"
            className="text-sm font-medium hover:text-primary transition-colors text-on-surface-variant"
          >
            Jobs
          </Link>
          <Link
            href="/dashboard/candidate"
            className="text-sm font-medium hover:text-primary transition-colors text-on-surface-variant"
          >
            Dashboard
          </Link>
          <Link
            href="/knowledge-factory"
            className="text-sm font-medium hover:text-primary transition-colors text-on-surface-variant"
          >
            Knowledge Factory
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="text-sm font-bold text-primary hover:text-on-primary-fixed-variant">
            Login
          </button>
          <button className="hero-gradient text-on-primary px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide editorial-shadow hover:opacity-90 transition-all">
            Apply Now
          </button>
        </div>
      </nav>
    </header>
  );
}
