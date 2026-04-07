'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    ErrorBoundaryState
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', textAlign: 'center' }}>
                    <div className="glass-card animate-fade-in" style={{ padding: 32, maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                        <AlertTriangle size={48} color="#ef4444" />
                        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {this.state.error?.message || "An unexpected error occurred in this component."}
                        </p>
                        <button 
                            className="btn-primary" 
                            onClick={() => this.setState({ hasError: false, error: null })}
                            style={{ marginTop: 12 }}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
