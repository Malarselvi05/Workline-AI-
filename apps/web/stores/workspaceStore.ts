import { create } from 'zustand';
import { listWorkflows, getMe, listPacks, Workflow, User, DomainPack } from '@/lib/api';

interface WorkspaceState {
    user: User | null;
    workflows: Workflow[];
    activeWorkflowId: number | null;
    activeTab: 'dashboard' | 'automate' | 'workflow';
    sidebarCollapsed: boolean;
    loading: boolean;

    setUser: (user: User | null) => void;
    fetchUser: () => Promise<void>;
    setActiveTab: (tab: 'dashboard' | 'automate' | 'workflow') => void;
    setActiveWorkflow: (id: number | null) => void;
    addWorkflow: (workflow: Workflow) => void;
    addWorkflowTab: (workflow: Workflow) => void;
    renameWorkflowTab: (id: number, name: string) => void;
    updateWorkflowStatus: (id: number, status: 'draft' | 'active' | 'archived') => void;
    toggleSidebar: () => void;
    fetchWorkflows: () => Promise<void>;
    installedPacks: string[];
    fetchPacks: () => Promise<void>;
    reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
    user: null,
    workflows: [],
    activeWorkflowId: null,
    activeTab: 'dashboard',
    sidebarCollapsed: false,
    loading: false,
    installedPacks: [],

    setUser: (user) => set({ user }),

    fetchUser: async () => {
        try {
            const user = await getMe();
            set({ user });
        } catch (err) {
            console.error('Failed to fetch current user:', err);
        }
    },

    setActiveTab: (tab) => set({ activeTab: tab }),

    setActiveWorkflow: (id) => set({ activeWorkflowId: id, activeTab: 'workflow' }),

    addWorkflow: (workflow) =>
        set((state) => ({
            workflows: [...state.workflows, workflow],
            activeWorkflowId: workflow.id,
            activeTab: 'workflow',
        })),

    // Alias: same as addWorkflow but named as per J4 spec
    addWorkflowTab: (workflow) =>
        set((state) => ({
            workflows: [...state.workflows, workflow],
            activeWorkflowId: workflow.id,
            activeTab: 'workflow',
        })),

    renameWorkflowTab: (id, name) =>
        set((state) => ({
            workflows: state.workflows.map((wf) =>
                wf.id === id ? { ...wf, name } : wf
            ),
        })),

    updateWorkflowStatus: (id, status) =>
        set((state) => ({
            workflows: state.workflows.map((wf) =>
                wf.id === id ? { ...wf, status } : wf
            ),
        })),

    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

    fetchWorkflows: async () => {
        set({ loading: true });
        try {
            const workflows = await listWorkflows();
            set({ workflows, loading: false });
        } catch {
            set({ loading: false });
        }
    },

    fetchPacks: async () => {
        try {
            const packs = await listPacks();
            set({ installedPacks: packs.filter(p => p.status === 'installed').map(p => p.name) });
        } catch (err) {
            console.error('Failed to fetch domain packs:', err);
        }
    },

    reset: () => set({
        user: null,
        workflows: [],
        activeWorkflowId: null,
        activeTab: 'dashboard',
        loading: false,
        installedPacks: []
    }),
}));