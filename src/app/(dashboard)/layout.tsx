import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F5F7' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', padding: '40px 48px', maxWidth: 1100 }}>
        {children}
      </main>
    </div>
  );
}
