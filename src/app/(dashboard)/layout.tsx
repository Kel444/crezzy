import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "transparent" }}>
      <Sidebar />
      <main style={{
        flex: 1,
        padding: "40px 48px",
        minHeight: "100vh",
        maxWidth: "calc(100vw - 220px)",
        background: "transparent",
      }}>
        {children}
      </main>
    </div>
  );
}
