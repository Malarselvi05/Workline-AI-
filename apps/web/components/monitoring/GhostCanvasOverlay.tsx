import React, { useEffect, useState } from 'react';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { getWorkflow, updateWorkflow } from '@/lib/api';
import { SEYON_WORKFLOW_ID } from '@/lib/seyon-config';
import { Zap, Save, RefreshCw, X } from 'lucide-react';
import WorkflowNode from '@/components/canvas/nodes/WorkflowNode';

const nodeTypes = { workflowNode: WorkflowNode };

interface Props {
    onClose: () => void;
}

export default function GhostCanvasOverlay({ onClose }: Props) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [workflowDetails, setWorkflowDetails] = useState<any>(null);

    useEffect(() => {
        const fetchDag = async () => {
            try {
                const wf = await getWorkflow(SEYON_WORKFLOW_ID);
                setWorkflowDetails(wf);
                if (wf.nodes) setNodes(wf.nodes);
                if (wf.edges) setEdges(wf.edges);
            } catch (err) {
                console.error("Failed to load Master DAG", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDag();
    }, [setNodes, setEdges]);

    const handleSave = async () => {
        if (!workflowDetails) return;
        setSaving(true);
        try {
            await updateWorkflow(SEYON_WORKFLOW_ID, {
                nodes: nodes,
                edges: edges,
                name: workflowDetails.name,
                description: workflowDetails.description
            });
            alert("Master DAG updated successfully!");
        } catch (error) {
            console.error("Save failed", error);
            alert("Failed to save the DAG.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <RefreshCw size={32} className="animate-spin" color="var(--accent-primary)" style={{ marginBottom: 16 }} />
                <p>Accessing Master Nervous System...</p>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: '12px 20px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--accent-primary)', borderRadius: 8, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Zap size={20} color="var(--accent-primary)" />
                    <div>
                        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'white' }}>Live Nervous System (Editable)</h3>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Drag nodes to restructure the AI logic</p>
                    </div>
                </div>
            </div>
            
            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: 12 }}>
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary" 
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8 }}
                >
                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving Map...' : 'Save DAG Map'}
                </button>
                <button 
                    onClick={onClose}
                    className="btn-ghost" 
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}
                >
                    <X size={16} />
                    Close
                </button>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
                style={{ background: 'transparent' }}
            >
                <Background color="rgba(255,255,255,0.05)" gap={24} size={2} />
                <Controls style={{ bottom: 20, left: 20, right: 'auto', top: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, overflow: 'hidden' }} />
                <MiniMap style={{ bottom: 20, right: 20, top: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8 }} nodeColor={(n) => {
                    return n.data?.category === 'ml' ? '#ec4899' : n.data?.category === 'mechanical' ? '#10b981' : '#6366f1';
                }} />
            </ReactFlow>
        </div>
    );
}
