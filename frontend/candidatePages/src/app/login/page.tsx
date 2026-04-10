"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { authApi } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("coastal-careers.access-token");
    if (token) {
      router.push("/dashboard/candidate");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authApi.login({ email: email.trim(), password });
      router.push("/dashboard/candidate");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 px-6 lg:px-20 py-12 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">
            Welcome Back
          </h1>
          <p className="text-on-surface-variant">
            Sign in to your candidate account
          </p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-bold text-on-surface">
              Email Address
            </label>
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
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-on-surface-variant">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">
            Create one
          </Link>
        </div>

        <div className="mt-8 bg-surface-container-low rounded-xl p-6 text-center">
          <p className="text-xs text-on-surface-variant mb-2">Demo Credentials</p>
          <p className="text-xs font-mono text-on-surface-variant/70">
            candidate@example.com / candidate123
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
