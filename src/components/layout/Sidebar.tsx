"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, TrendingUp, FileText, Settings, LogOut, PlayCircle, Briefcase, Wallet, Sparkles } from "lucide-react";

const nav = [
  { href: "/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
  { href: "/youtube",     icon: PlayCircle,      label: "YouTube" },
  { href: "/revenus",     icon: TrendingUp,      label: "Revenus" },
  { href: "/depenses",    icon: Wallet,          label: "Dépenses" },
  { href: "/facturation", icon: FileText,        label: "Facturation" },
  { href: "/brand-deals", icon: Briefcase,       label: "Brand Deals" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside style={{
      width: 220,
      minHeight: "100vh",
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(32px)",
      WebkitBackdropFilter: "blur(32px)",
      borderRight: "1px solid rgba(255,255,255,0.09)",
      display: "flex",
      flexDirection: "column",
      padding: "20px 12px",
      boxShadow: "1px 0 0 rgba(255,255,255,0.04)",
      position: "sticky",
      top: 0,
      height: "100vh",
    }}>
      {/* Logo */}
      <div style={{ padding: "4px 8px", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg, #FF6B9D 0%, #FF2D78 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(255,45,120,0.45)",
          }}>
            <Sparkles style={{ width: 16, height: 16, color: "#fff" }} />
          </div>
          <span style={{
            fontWeight: 800, fontSize: 18, letterSpacing: "-0.04em",
            background: "linear-gradient(135deg, #FF8AB8, #FF2D78)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Crezzy
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 11,
              fontSize: 14, fontWeight: active ? 600 : 400,
              textDecoration: "none", transition: "all 0.15s ease",
              color: active ? "#FF2D78" : "rgba(255,255,255,0.5)",
              background: active ? "rgba(255,45,120,0.14)" : "transparent",
              border: active ? "1px solid rgba(255,45,120,0.2)" : "1px solid transparent",
            }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; } }}
            >
              <Icon style={{ width: 16, height: 16, color: active ? "#FF2D78" : "rgba(255,255,255,0.35)", flexShrink: 0 }} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
        <Link href="/parametres" style={{
          display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 11,
          fontSize: 14, fontWeight: pathname === "/parametres" ? 600 : 400, textDecoration: "none",
          color: pathname === "/parametres" ? "#FF2D78" : "rgba(255,255,255,0.5)",
          background: pathname === "/parametres" ? "rgba(255,45,120,0.14)" : "transparent",
          border: pathname === "/parametres" ? "1px solid rgba(255,45,120,0.2)" : "1px solid transparent",
        }}>
          <Settings style={{ width: 16, height: 16, color: pathname === "/parametres" ? "#FF2D78" : "rgba(255,255,255,0.35)" }} />
          Paramètres
        </Link>
        <button onClick={signOut} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 11,
          fontSize: 14, fontWeight: 400, border: "1px solid transparent",
          background: "transparent", cursor: "pointer", color: "rgba(255,255,255,0.35)", width: "100%", textAlign: "left",
          transition: "all 0.15s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}
        >
          <LogOut style={{ width: 16, height: 16, flexShrink: 0 }} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
