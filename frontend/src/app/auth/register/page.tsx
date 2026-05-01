"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/authStore";
import { UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    try {
      await register(email, password, fullName);
      setSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err?.code === "ERR_NETWORK" || err?.code === "ECONNREFUSED" || !err?.response) {
        setError("Cannot connect to server. Make sure the backend is running.");
      } else {
        setError("Registration failed. Please try again.");
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-display font-bold text-2xl glow-text-green mb-2">
            ■ LANDGRAB
          </div>
          <div className="font-mono text-text-muted text-sm uppercase tracking-widest">
            CREATE ACCOUNT
          </div>
        </div>

        <div className="hud-card p-8">
          <h1 className="font-display font-bold text-xl text-text-primary mb-6 uppercase tracking-wider">
            Register
          </h1>

          {success && (
            <div className="mb-4 p-3 border border-accent-green/40 bg-accent-green/10 font-mono text-xs text-accent-green">
              ✓ Account created! Redirecting...
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 border border-accent-red/40 bg-accent-red/10 font-mono text-xs text-accent-red">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full h-11 px-4 bg-bg-primary border border-border-subtle text-text-primary
                  font-mono text-sm placeholder:text-text-muted
                  focus:border-accent-green/50 outline-none transition-colors"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 px-4 bg-bg-primary border border-border-subtle text-text-primary
                  font-mono text-sm placeholder:text-text-muted
                  focus:border-accent-green/50 outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full h-11 px-4 bg-bg-primary border border-border-subtle text-text-primary
                  font-mono text-sm placeholder:text-text-muted
                  focus:border-accent-green/50 outline-none transition-colors"
                placeholder="Min. 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-accent-green text-bg-primary font-display font-bold
                uppercase tracking-wider text-sm hover:bg-accent-green/90 transition-colors
                disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center font-mono text-xs text-text-muted">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-accent-green hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
