"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/workspace/Sidebar";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export default function AppContent({ children }: { children: React.ReactNode }) {
  console.log("[JS] AppContent.tsx | AppContent | L8: System checking in");
    const pathname = usePathname();
    const { fetchUser } = useWorkspaceStore();
    const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/";

    useEffect(() => {
        if (!isAuthPage) {
            fetchUser();
        }
    }, [isAuthPage, fetchUser]);

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {!isAuthPage && <Sidebar />}
            <main style={{
                flex: 1,
                overflow: 'auto',
                position: 'relative',
                display: isAuthPage ? 'block' : 'flex',
                flexDirection: isAuthPage ? 'unset' : 'column'
            }}>
                {children}
            </main>
        </div>
    );
}