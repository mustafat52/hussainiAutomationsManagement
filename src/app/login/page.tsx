"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const GREETING = "Welcome, Boss";
const WELCOME_MS = 2600; // how long the welcome screen plays before opening the dashboard

function WelcomeScreen({ reduced, onSkip }: { reduced: boolean; onSkip: () => void }) {
  const letters = GREETING.split("");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      onClick={onSkip}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 cursor-pointer overflow-hidden"
      style={{ background: "var(--bg-page)" }}
      role="status"
      aria-live="polite"
    >
      {/* soft glow behind the logo */}
      <motion.div
        aria-hidden
        className="absolute rounded-full"
        style={{ width: 340, height: 340, background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)" }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: reduced ? 1 : [0.4, 1.15, 1], opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />

      {/* logo: the same ">_" mark as the app icon, drawn in */}
      <motion.svg
        width="84"
        height="84"
        viewBox="0 0 84 84"
        fill="none"
        className="relative mb-7"
        initial={{ scale: reduced ? 1 : 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.path
          d="M22 24 L46 42 L22 60"
          stroke="var(--accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduced ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeInOut" }}
        />
        <motion.path
          d="M52 62 H68"
          stroke="var(--accent)"
          strokeWidth="7"
          strokeLinecap="round"
          initial={{ pathLength: reduced ? 1 : 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.65 }}
        />
      </motion.svg>

      {/* greeting, letter by letter */}
      <h1 className="relative text-3xl sm:text-4xl font-medium mono flex flex-wrap justify-center" aria-label={GREETING}>
        {letters.map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={{ opacity: 0, y: reduced ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.55 + i * 0.045 }}
            style={{ color: i >= 9 ? "var(--accent)" : "var(--text-primary)", whiteSpace: "pre" }}
          >
            {ch}
          </motion.span>
        ))}
        <motion.span
          aria-hidden
          className="cursor-blink ml-0.5"
          style={{ color: "var(--accent)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 + letters.length * 0.045 }}
        >
          _
        </motion.span>
      </h1>

      <motion.p
        className="relative mt-3 text-sm flex items-center gap-1.5"
        style={{ color: "var(--text-secondary)" }}
        initial={{ opacity: 0, y: reduced ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.35 }}
      >
        <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--success)" }} />
        Your project command center is ready
      </motion.p>

      {/* progress line that fills while the dashboard loads */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--surface-2)" }}>
        <motion.div
          className="h-full"
          style={{ background: "var(--accent)" }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: WELCOME_MS / 1000, ease: "linear" }}
        />
      </div>
      <p className="absolute bottom-5 text-[11px] mono" style={{ color: "var(--text-muted)" }}>tap to skip</p>
    </motion.div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const reduced = !!useReducedMotion();
  const leaving = useRef(false);

  function goToDashboard() {
    if (leaving.current) return; // timer and "tap to skip" must not both fire
    leaving.current = true;
    // Full reload so the server sees the new session cookie.
    window.location.href = "/";
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setWelcome(true);
    setTimeout(goToDashboard, reduced ? 1200 : WELCOME_MS);
  }

  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)" };

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <form
        onSubmit={signIn}
        className="w-full max-w-sm rounded-xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h1 className="text-xl font-medium mono flex items-center mb-1">
          hussaini@automations
          <span className="cursor-blink ml-0.5" style={{ color: "var(--accent)" }}>_</span>
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Sign in to your project hub.</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-base sm:text-sm px-2.5 py-2 rounded-md mt-1.5"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-base sm:text-sm px-2.5 py-2 rounded-md mt-1.5"
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs mt-3" style={{ color: "var(--danger)" }} role="alert">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full text-sm px-3.5 py-2.5 rounded-md font-medium mt-5"
          style={{ background: "var(--accent)", color: "#0a0b0f", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {welcome && <WelcomeScreen reduced={reduced} onSkip={goToDashboard} />}
    </div>
  );
}