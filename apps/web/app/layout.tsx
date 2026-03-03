import type { Metadata } from "next";
import "./globals.css";
import AppContent from "@/components/layout/AppContent";

export const metadata: Metadata = {
  title: "WorkLine AI — Agentic Automation Platform",
  description: "No-code, graph-based AI workflow automation platform. Convert natural language into executable automation pipelines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--bg-primary)', margin: 0 }}>
        <AppContent>{children}</AppContent>
      </body>
    </html>
  );
}
