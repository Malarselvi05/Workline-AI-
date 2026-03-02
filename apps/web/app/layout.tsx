import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/workspace/Sidebar";

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
      <body style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
