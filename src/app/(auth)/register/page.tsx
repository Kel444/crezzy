"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard");
    router.refresh();
  }

  const D = { bg: "#111113", card: "#1C1C1E", border: "rgba(255,255,255,0.08)", text: "#F5F5F7", sub: "#8E8E93", pink: "#FF2D78" };

  return (
    <div style={{ minHeight: "100vh", background: D.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #FF6B9D, #FF2D78)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(255,45,120,0.4)", marginBottom: 12 }}>
          <Sparkles style={{ width: 24, height: 24, color: "#fff" }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: D.text, margin: 0, letterSpacing: "-0.03em" }}>Crezzy</h1>
        <p style={{ color: D.sub, fontSize: 13, margin: "4px 0 0" }}>Finance créateur</p>
      </div>

      <div style={{ background: D.card, borderRadius: 20, border: `1px solid ${D.border}`, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: D.text, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Créer un compte</h2>
        <p style={{ color: D.sub, fontSize: 13, margin: "0 0 24px" }}>Lance-toi 🚀</p>

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Email</label>
            <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="toi@email.com" required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Mot de passe</label>
            <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          {error && <p style={{ fontSize: 13, color: "#FF3B30", background: "rgba(255,59,48,0.1)", padding: "10px 14px", borderRadius: 10, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: D.pink, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 }}>
            {loading ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />Création...</> : "Créer mon compte"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: D.sub, marginTop: 20 }}>
          Déjà un compte ?{" "}
          <Link href="/login" style={{ color: D.pink, fontWeight: 600, textDecoration: "none" }}>Se connecter</Link>
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
