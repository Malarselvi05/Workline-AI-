import { create } from 'zustand';
import { planWorkflow, getConversation, WorkflowProposal, Conversation } from '@/lib/api';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    proposal?: WorkflowProposal;
    timestamp: Date;
}

interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    isOpen: boolean;
    conversationId: number | null;

    toggleChat: () => void;
    setOpen: (open: boolean) => void;
    sendMessage: (goal: string) => Promise<WorkflowProposal | null>;
    loadConversation: (id: number) => Promise<void>;
    clearMessages: () => void;
    setConversationId: (id: number | null) => void;
}

function turnToMessage(turn: Conversation['turns'][number]): ChatMessage {
  console.log("[JS] chatStore.ts | turnToMessage | L26: Data processing");
    return {
        id: `turn-${turn.id}`,
        role: turn.role,
        content: turn.content,
        proposal: turn.proposal_json ?? undefined,
        timestamp: new Date(turn.created_at),
    };
}

export const useChatStore = create<ChatState>((set, get) => ({
    messages: [],
    isLoading: false,
    isOpen: false,
    conversationId: null,

    toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
    setOpen: (open) => set({ isOpen: open }),
    setConversationId: (id) => set({ conversationId: id }),

    sendMessage: async (goal: string) => {
        const { conversationId } = get();
        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: goal,
            timestamp: new Date(),
        };
        set((state) => ({
            messages: [...state.messages, userMsg],
            isLoading: true,
        }));

        try {
            const proposal = await planWorkflow({
                goal,
                ...(conversationId ? { conversation_id: conversationId } : {}),
            });

            // Persist the conversation_id for subsequent turns
            if (proposal.conversation_id && !conversationId) {
                set({ conversationId: proposal.conversation_id });
            }

            const assistantMsg: ChatMessage = {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: proposal.reasoning,
                proposal,
                timestamp: new Date(),
            };
            set((state) => ({
                messages: [...state.messages, assistantMsg],
                isLoading: false,
            }));
            return proposal;
        } catch (error) {
            const errorMsg: ChatMessage = {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
                timestamp: new Date(),
            };
            set((state) => ({
                messages: [...state.messages, errorMsg],
                isLoading: false,
            }));
            return null;
        }
    },

    loadConversation: async (id: number) => {
        set({ isLoading: true });
        try {
            const conv: Conversation = await getConversation(id);
            const messages = conv.turns.map(turnToMessage);
            set({ messages, conversationId: conv.id, isLoading: false });
        } catch (error) {
            const errMsg: ChatMessage = {
                id: `load-err-${Date.now()}`,
                role: 'assistant',
                content: `Failed to load conversation #${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date(),
            };
            set((state) => ({ messages: [...state.messages, errMsg], isLoading: false }));
        }
    },

    clearMessages: () => set({ messages: [], conversationId: null }),
}));