import React from 'react';
import type { SongNode } from '../types/gbsong';
import { Code, Upload, FolderPlus, Hash, Trash2 } from 'lucide-react';

interface SidebarProps {
    nodes: SongNode[];
    selectedNodeId: number;
    onSelectNode: (id: number) => void;
    onAddNode: () => void;
    onDeleteNode: (id: number) => void;
    onOpenImport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
                                                    nodes,
                                                    selectedNodeId,
                                                    onSelectNode,
                                                    onAddNode,
                                                    onDeleteNode,
                                                    onOpenImport
                                                }) => {
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3><Code size={18} color="#89b4fa" /> GB Song Nodes</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={onOpenImport} className="primary-btn" title="Import C Header File">
                        <Upload size={14} /> Import .h
                    </button>
                    <button onClick={onAddNode} className="primary-btn">
                        <FolderPlus size={14} /> Add
                    </button>
                </div>
            </div>

            <div className="node-list">
                {nodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    return (
                        <div
                            key={node.id}
                            onClick={() => onSelectNode(node.id)}
                            className={`node-item ${isSelected ? 'selected' : ''}`}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Hash size={14} color="#f9e2af" />
                                <span>{node.id === 999 ? 'Main Track (999)' : `Node #${node.id}`}</span>
                                <span className="badge">{node.commands.length} cmds</span>
                            </div>
                            {nodes.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteNode(node.id);
                                    }}
                                    className="btn-danger"
                                    title="Delete Node"
                                >
                                    <Trash2 size={13} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Sidebar;
