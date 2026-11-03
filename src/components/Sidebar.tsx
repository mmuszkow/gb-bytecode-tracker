import React, { useState } from 'react';
import { ListView } from './ListView';
import { GraphView } from './GraphView';
import { FolderPlus, List, Network } from 'lucide-react';
import './Sidebar.css';
import type {SongNode} from "../types/song_node.ts";

interface SidebarProps {
    nodes: SongNode[];
    selectedNodeId: number;
    onSelectNode: (id: number) => void;
    onAddNode: () => void;
    onDeleteNode: (id: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
                                                    nodes,
                                                    selectedNodeId,
                                                    onSelectNode,
                                                    onAddNode,
                                                    onDeleteNode,
                                                }) => {
    const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3>Song Nodes</h3>
                <button onClick={onAddNode} className="primary-btn">
                    <FolderPlus size={14} /> Add Node
                </button>
            </div>

            {/* Mode Switcher */}
            <div className="view-switch-container">
                <div className="view-switch">
                    <button
                        className={`switch-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        <List size={14} /> List View
                    </button>
                    <button
                        className={`switch-btn ${viewMode === 'graph' ? 'active' : ''}`}
                        onClick={() => setViewMode('graph')}
                    >
                        <Network size={14} /> Graph View
                    </button>
                </div>
            </div>

            {/* Content View */}
            <div className="node-list-content">
                {viewMode === 'list' ? (
                    <ListView
                        nodes={nodes}
                        selectedNodeId={selectedNodeId}
                        onSelectNode={onSelectNode}
                        onDeleteNode={onDeleteNode}
                    />
                ) : (
                    <GraphView
                        nodes={nodes}
                        selectedNodeId={selectedNodeId}
                        onSelectNode={onSelectNode}
                    />
                )}
            </div>
        </div>
    );
};