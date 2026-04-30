"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, TrendingUp, Receipt, FileText, Settings,
  LogOut, Youtube, Briefcase, Wallet, Sparkles
} from "lucide-react";

const nav = [
  { href: "/dashboard",    icon: LayoutDashboard, label: "Dashboard" },
  { href: "/youtube",      icon: Youtube,         label: "YouTube" },
  { href: "/revenus",      icon: TrendingUp,      label: "Revenus" },
  { href: "/depenses",     icon: Wallet,          label: "Dépenses" },
  { href: "/facturation",  icon: FileText,        label: "Facturation" },
  { href: "/brand-deals",  icon: Briefcase,       label: "Brand Deals" },
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
    <aside className="w-60 min-h-screen flex flex-col py-6 px-3 border-r border-purple-100 bg-white/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-3 mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Crezzy
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? "gradient-primary text-white shadow-md shadow-purple-200"
                  : "text-purple-900/60 hover:bg-purple-50 hover:text-purple-900"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-purple-400 group-hover:text-purple-600"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="space-y-0.5 pt-4 border-t border-purple-100">
        <Link
          href="/parametres"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
            pathname === "/parametres"
              ? "gradient-primary text-white shadow-md shadow-purple-200"
              : "text-purple-900/60 hover:bg-purple-50 hover:text-purple-900"
          }`}
        >
          <Settings className={`w-4 h-4 ${pathname === "/parametres" ? "text-white" : "text-purple-400 group-hover:text-purple-600"}`} />
          Paramètres
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-purple-900/60 hover:bg-red-50 hover:text-red-500 transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4 text-purple-400 group-hover:text-red-400" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
