"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const G = "#1E3832";
const C = "#F5F0E8";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/management";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/management/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Login gagal");
      }
      router.push(from);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: G, letterSpacing: "0.04em" }}>DonaTalks</div>
        <div style={{ fontSize: "0.78rem", color: "rgba(30,56,50,0.45)", marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>Management</div>
      </div>

      <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "32px 28px", width: "100%", maxWidth: 360, boxShadow: "0 4px 24px rgba(30,56,50,0.08)" }}>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: G, marginBottom: 24 }}>Masuk</h1>

        {error && (
          <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: "0.83rem", marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: G, marginBottom: 5 }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              style={{ width: "100%", padding: "9px 12px", border: "1px solid rgba(30,56,50,0.22)", borderRadius: 8, fontSize: "0.9rem", color: G, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: G, marginBottom: 5 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ width: "100%", padding: "9px 12px", border: "1px solid rgba(30,56,50,0.22)", borderRadius: 8, fontSize: "0.9rem", color: G, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 4, backgroundColor: G, color: C, border: "none", borderRadius: 8, padding: "11px", fontSize: "0.9rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
