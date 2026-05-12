"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();

  async function handleGoogleLogin() {
    setStatus("loading");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "openid email profile",
      },
    });
    if (error) {
      setStatus("error");
      setErrorMsg("Could not connect to Google. Try again.");
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message === "Invalid login credentials"
        ? "Incorrect email or password."
        : "Something went wrong. Try again."
      );
    }
    // On success, middleware redirects to /dashboard automatically
  }

  return (
    <main className="min-h-screen page-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Back */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/30 hover:text-white/60 text-sm mb-10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>

          {/* Header */}
          <div className="mb-8">
            <p className="text-[var(--color-gold)] text-xs tracking-widest uppercase font-medium mb-3">
              Nexus
            </p>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              Welcome back
            </h1>
            <p className="text-white/40 text-sm mt-1">Sign in to your command center.</p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={status === "loading"}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/8 hover:border-white/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/20 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email + password */}
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors text-sm"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors text-sm pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {status === "error" && (
              <p className="text-[var(--color-danger)] text-xs text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3 rounded-xl bg-[var(--color-gold)] text-black font-semibold text-sm hover:bg-[var(--color-gold-bright)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {status === "loading" ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-white/20 text-xs mt-6">
            Don&apos;t have access?{" "}
            <Link href="/" className="text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">
              Join the waitlist
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
