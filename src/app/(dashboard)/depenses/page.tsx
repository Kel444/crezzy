"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatEur, formatDate } from "@/lib/utils";
import { Plus, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";
import type { Depense, CategorieDepense } from "@/lib/types";

const CATS = [
  { value: "materiel",      label: "Matériel",        icon: "🎥" },
  { value: "logiciels",     label: "Logiciels",        icon: "💻" },
  { value: "sous-traitants",label: "Sous-traitants",   icon: "👥" },
  { value: "deplacements",  label: "Déplacements",     icon: "🚗" },
  { value: "formation",     label: "Formation",        icon: "📚" },
  { value: "communication", label: "Communication",    icon: "📣" },
  { value: "bureau",        label: "Bureau",           icon: "🏠" },
  { value: "autre",         label: "Autre",            icon: "📦" },
];

const D = {
  card: "#1C1C1E", card2: "#2C2C2E",
  border: "rgba(255,255,255,0.07)",
  text: "#F5F5F7", sub: "#8E8E93", muted: "#636366",
  pink: "#FF2D78", green: "#30D158", orange: "#FF9F0A",
};

export default function DepensesPage() {
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState("toutes");
  const [filterDed, setFilterDed] = useState("toutes");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    categorie: "materiel" as CategorieDepense,
    description: "", montant: "",
    date_depense: new Date().toISOString().split("T")[0],
    deductible: true,
  });
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("depenses").select("*").eq("user_id", user.id).order("date_depense", { ascending: false });
    if (data) setDepenses(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addDepense(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    await supabase.from("depenses").insert({ user_id: user.id, ...form, montant: parseFloat(form.montant) });
    setForm({ categorie: "materiel", description: "", montant: "", date_depense: new Date().toISOString().split("T")[0], deductible: true });
    setShowModal(false);
    setSaving(false);
    load();
  }

  async function del(id: string) {
    await supabase.from("depenses").delete().eq("id", id);
    setDepenses(prev => prev.filter(d => d.id !== id));
  }

  const filtered = depenses.filter(d => {
    if (filterCat !== "toutes" && d.categorie !== filterCat) return false;
    if (filterDed === "deductible" && !d.deductible) return false;
    if (filterDed === "non-deductible" && d.deductible) return false;
    return true;
  });

  const totalDed = depenses.filter(d => d.deductible).reduce((s, d) => s + d.montant, 0);
  const totalNonDed = depenses.filter(d => !d.deductible).reduce((s, d) => s + d.montant, 0);
  const total = depenses.reduce((s, d) => s + d.montant, 0);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <Loader2 style={{ width: 28, height: 28, color: D.pink, animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", color: D.text, margin: 0 }}>Dépenses</h1>
          <p style={{ color: D.sub, fontSize: 14, marginTop: 4 }}>Suis ce que tu dépenses et ce que tu peux déduire</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 980, background: D.pink, color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
          <Plus style={{ width: 15, height: 15 }} />Ajouter une dépense
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {[
          { label: "Total dépenses", val: formatEur(total), color: D.text, bg: D.card },
          { label: "Déductibles", val: formatEur(totalDed), color: D.green, bg: D.card },
          { label: "Non déductibles", val: formatEur(totalNonDed), color: D.orange, bg: D.card },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 16, border: `1px solid ${D.border}`, padding: 20 }}>
            <p style={{ fontSize: 11, color: D.sub, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 10px" }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: 0, letterSpacing: "-0.03em" }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10 }}>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: "8px 14px", color: D.text, fontSize: 13, cursor: "pointer", outline: "none" }}>
          <option value="toutes">Toutes les catégories</option>
          {CATS.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
        </select>
        <select value={filterDed} onChange={e => setFilterDed(e.target.value)} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: "8px 14px", color: D.text, fontSize: 13, cursor: "pointer", outline: "none" }}>
          <option value="toutes">Toutes</option>
          <option value="deductible">Déductibles</option>
          <option value="non-deductible">Non déductibles</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ background: D.card, borderRadius: 18, border: `1px solid ${D.border}`, padding: "48px 32px", textAlign: "center" }}>
          <p style={{ color: D.sub, fontSize: 15, fontWeight: 500, margin: 0 }}>Aucune dépense trouvée</p>
          <p style={{ color: D.muted, fontSize: 13, margin: "4px 0 0" }}>Ajoute ta première dépense pour commencer</p>
        </div>
      ) : (
        <div style={{ background: D.card, borderRadius: 18, border: `1px solid ${D.border}`, overflow: "hidden" }}>
          {filtered.map((d, i) => {
            const cat = CATS.find(c => c.value === d.categorie);
            return (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: i < filtered.length - 1 ? `1px solid ${D.border}` : "none" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: D.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {cat?.icon || "📦"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: D.text, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.description}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: D.muted }}>{cat?.label}</span>
                    <span style={{ fontSize: 11, color: D.muted }}>·</span>
                    <span style={{ fontSize: 11, color: D.muted }}>{formatDate(d.date_depense)}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: d.deductible ? "rgba(48,209,88,0.12)" : "rgba(255,159,10,0.12)", color: d.deductible ? D.green : D.orange }}>
                      {d.deductible ? <CheckCircle style={{ width: 10, height: 10 }} /> : <XCircle style={{ width: 10, height: 10 }} />}
                      {d.deductible ? "Déductible" : "Non déductible"}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: D.text, margin: 0, whiteSpace: "nowrap" }}>-{formatEur(d.montant)}</p>
                <button onClick={() => del(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: D.muted, padding: 6, borderRadius: 8, display: "flex" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#FF3B30")}
                  onMouseLeave={e => (e.currentTarget.style.color = D.muted)}
                ><Trash2 style={{ width: 15, height: 15 }} /></button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: D.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 440, border: `1px solid ${D.border}`, boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Nouvelle dépense</h2>
              <button onClick={() => setShowModal(false)} style={{ border: "none", background: "none", cursor: "pointer", color: D.muted, fontSize: 22, lineHeight: 1, display: "flex" }}>×</button>
            </div>
            <form onSubmit={addDepense} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Description</label>
                <input className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="ex: Micro Blue Yeti" required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Montant (€)</label>
                  <input className="input-field" type="number" step="0.01" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} placeholder="0,00" required />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Date</label>
                  <input className="input-field" type="date" value={form.date_depense} onChange={e => setForm({ ...form, date_depense: e.target.value })} required />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Catégorie</label>
                <select className="input-field" value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value as CategorieDepense })}>
                  {CATS.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: D.card2, borderRadius: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: D.text, margin: 0 }}>Déductible fiscalement</p>
                  <p style={{ fontSize: 11, color: D.muted, margin: "2px 0 0" }}>Dépense liée à ton activité</p>
                </div>
                <button type="button" onClick={() => setForm({ ...form, deductible: !form.deductible })}
                  style={{ width: 44, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: form.deductible ? D.green : D.card, position: "relative", transition: "background 0.2s", padding: 0 }}>
                  <span style={{ position: "absolute", top: 3, left: form.deductible ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                </button>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1px solid ${D.border}`, background: "transparent", fontSize: 14, fontWeight: 500, cursor: "pointer", color: D.sub }}>Annuler</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: D.pink, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#fff" }}>
                  {saving ? "Enregistrement..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
