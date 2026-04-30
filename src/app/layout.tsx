import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crezzy — Finance Créateur",
  description: "Gérez vos revenus, dépenses et obligations fiscales en tant que créateur de contenu.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
