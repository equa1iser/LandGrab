"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/authStore";
import { Eye, EyeOff, LogIn } from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId || !googleBtnRef.current) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
      });
      window.google?.accounts.id.renderButton(googleBtnRef.current!, {
        theme: "filled_black",
        size: "large",
        width: googleBtnRef.current!.offsetWidth || 400,
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
      });
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  async function handleGoogleCredential(response: { credential: string }) {
    setError("");
    try {
      await loginWithGoogle(response.credential);
      router.push("/");
    } catch {
      setError("Google sign-in failed. Please try again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      router.push("/");
    } catch {
      setError("Invalid email or password");
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
            SECURE ACCESS
          </div>
        </div>

        <div className="hud-card p-8">
          <h1 className="font-display font-bold text-xl text-text-primary mb-6 uppercase tracking-wider">
            Sign In
          </h1>

          {error && (
            <div className="mb-4 p-3 border border-accent-red/40 bg-accent-red/10 font-mono text-xs text-accent-red">
              ⚠ {error}
            </div>
          )}

          {/* Google Sign-In */}
          {process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID && (
            <>
              <div ref={googleBtnRef} className="w-full mb-4" />
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="font-mono text-xs text-text-muted uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 px-4 pr-11 bg-bg-primary border border-border-subtle text-text-primary
                    font-mono text-sm placeholder:text-text-muted
                    focus:border-accent-green/50 outline-none transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-accent-green text-bg-primary font-display font-bold
                uppercase tracking-wider text-sm hover:bg-accent-green/90 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center font-mono text-xs text-text-muted">
            No account?{" "}
            <Link href="/auth/register" className="text-accent-green hover:underline">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
