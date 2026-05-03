import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: `
        radial-gradient(ellipse 70% 55% at 10% 5%, rgba(120,50,255,0.30) 0%, transparent 55%),
        radial-gradient(ellipse 55% 45% at 90% 95%, rgba(255,45,120,0.24) 0%, transparent 50%),
        radial-gradient(ellipse 45% 40% at 85% 5%, rgba(10,132,255,0.18) 0%, transparent 45%),
        #07070F
      `,
    }}>
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
