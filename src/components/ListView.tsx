import React from 'react';
import type { SongNode } from '../types/gbsong';
import { Hash, Trash2 } from 'lucide-react';

interface ListViewProps {
    nodes: SongNode[];
    selectedNodeId: number;
    onSelectNode: (id: number) => void;
    onDeleteNode: (id: number) => void;
}

export const ListView: React.FC<ListViewProps> = ({
                                                      nodes,
                                                      selectedNodeId,
                                                      onSelectNode,
                                                      onDeleteNode,
                                                  }) => {
    return (
        <div className="node-list">
            {nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const displayName =
                    node.name && node.name.trim() !== ''
                        ? node.name
                        : node.id === 999
                            ? 'Main Track (999)'
                            : `Node #${node.id}`;

                return (
                    <div
                        key={node.id}
                        onClick={() => onSelectNode(node.id)}
                        className={`node-item ${isSelected ? 'selected' : ''}`}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Hash size={14} color="#f9e2af" />
                            <span>{displayName}</span>
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
    );
};