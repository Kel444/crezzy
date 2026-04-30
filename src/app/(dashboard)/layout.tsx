import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#111113" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "40px 48px", background: "#111113", minHeight: "100vh", maxWidth: "calc(100vw - 220px)" }}>
        {children}
      </main>
    </div>
  );
}
