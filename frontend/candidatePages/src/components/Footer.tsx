import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface-container-lowest pt-24 pb-12 border-t border-outline-variant/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-20">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-8">
              <div className="text-primary">
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
              </div>
              <span className="font-headline text-xl font-extrabold tracking-tight text-on-surface">
                Coastal Seven
              </span>
            </div>
            <p className="text-on-surface-variant max-w-xs leading-relaxed">
              Leveraging the power of generative AI to connect the world&apos;s
              best talent with the world&apos;s best companies.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h5 className="font-headline font-extrabold mb-6 text-on-surface">
              Platform
            </h5>
            <ul className="space-y-4 text-on-surface-variant">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/jobs"
                  className="hover:text-primary transition-colors"
                >
                  Jobs
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/candidate"
                  className="hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/knowledge-factory"
                  className="hover:text-primary transition-colors"
                >
                  Knowledge Factory
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h5 className="font-headline font-extrabold mb-6 text-on-surface">
              Resources
            </h5>
            <ul className="space-y-4 text-on-surface-variant">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Resume Tips
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Fair Hiring
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h5 className="font-headline font-extrabold mb-6 text-on-surface">
              Legal
            </h5>
            <ul className="space-y-4 text-on-surface-variant">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-on-surface-variant">
            &copy; 2024 Coastal Seven Inc. All rights reserved.
          </p>
          <div className="flex gap-6">
            <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
              language
            </span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
              share
            </span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
              mail
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
