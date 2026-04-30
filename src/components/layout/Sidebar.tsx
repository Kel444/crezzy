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
    <aside style={{ width: 220, minHeight: '100vh', background: '#fff', borderRight: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', padding: '20px 12px' }}>
      {/* Logo */}
      <div style={{ padding: '4px 8px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #FF6B9D 0%, #FF2D78 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(255,45,120,0.3)' }}>
            <Sparkles style={{ width: 16, height: 16, color: '#fff' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #FF6B9D, #FF2D78)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Crezzy
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
              fontSize: 14, fontWeight: active ? 600 : 400, textDecoration: 'none', transition: 'all 0.12s ease',
              color: active ? '#FF2D78' : '#6E6E73',
              background: active ? 'rgba(255,45,120,0.08)' : 'transparent',
            }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F5F5F7'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon style={{ width: 16, height: 16, color: active ? '#FF2D78' : '#AEAEB2', flexShrink: 0 }} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        {(() => {
          const active = pathname === "/parametres";
          return (
            <Link href="/parametres" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
              fontSize: 14, fontWeight: active ? 600 : 400, textDecoration: 'none', transition: 'all 0.12s ease',
              color: active ? '#FF2D78' : '#6E6E73',
              background: active ? 'rgba(255,45,120,0.08)' : 'transparent',
            }}>
              <Settings style={{ width: 16, height: 16, color: active ? '#FF2D78' : '#AEAEB2' }} />
              Paramètres
            </Link>
          );
        })()}
        <button onClick={signOut} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
          fontSize: 14, fontWeight: 400, border: 'none', background: 'transparent', cursor: 'pointer',
          color: '#AEAEB2', transition: 'all 0.12s ease', width: '100%', textAlign: 'left',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF3B30'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,59,48,0.06)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#AEAEB2'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <LogOut style={{ width: 16, height: 16 }} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
