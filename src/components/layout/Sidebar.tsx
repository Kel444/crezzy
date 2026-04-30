"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, TrendingUp, FileText, Settings,
  LogOut, PlayCircle, Briefcase, Wallet, Sparkles
} from "lucide-react";

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
    <aside className="w-56 min-h-screen flex flex-col py-5 px-3 border-r border-pink-100 bg-white">
      {/* Logo */}
      <div className="px-2 mb-7">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-sm shadow-pink-200">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "gradient-primary text-white shadow-sm shadow-pink-200"
                  : "text-gray-500 hover:bg-pink-50 hover:text-pink-700"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-pink-300"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="space-y-0.5 pt-4 border-t border-pink-100">
        <Link
          href="/parametres"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
            pathname === "/parametres"
              ? "gradient-primary text-white shadow-sm shadow-pink-200"
              : "text-gray-500 hover:bg-pink-50 hover:text-pink-700"
          }`}
        >
          <Settings className={`w-4 h-4 ${pathname === "/parametres" ? "text-white" : "text-pink-300"}`} />
          Paramètres
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-400 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
