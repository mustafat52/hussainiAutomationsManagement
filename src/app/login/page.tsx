"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    // Full reload so the server sees the new session cookie.
    window.location.href = "/";
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
    </div>
  );
}
