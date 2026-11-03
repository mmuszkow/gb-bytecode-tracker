import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Hash, Trash2, Repeat } from 'lucide-react';
import type { SongNode } from '../types/song_node.ts';

interface TreeViewProps {
  nodes: SongNode[];
  selectedNodeId: number;
  onSelectNode: (id: number) => void;
  onDeleteNode: (id: number) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
}) => {
  const nodesMap = new Map<number, SongNode>();
  nodes.forEach((n) => nodesMap.set(n.id, n));

  // Identify all target nodes called by CALL_NODE commands
  const calledNodeIds = new Set<number>();
  nodes.forEach((node) => {
    node.commands.forEach((cmd) => {
      if (cmd.type === 'CALL_NODE8' || cmd.type === 'CALL_NODE16') {
        calledNodeIds.add(cmd.targetNodeId);
      }
    });
  });

  // Root nodes: Main Track (999), Node 0, or nodes not called by any other node
  let rootNodes = nodes.filter((node) => !calledNodeIds.has(node.id));
  if (rootNodes.length === 0 && nodes.length > 0) {
    rootNodes = [nodes[0]];
  }

  return (
    <div className="tree-container">
      {rootNodes.map((node) => (
        <TreeNodeItem
          key={node.id}
          nodeId={node.id}
          nodesMap={nodesMap}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onDeleteNode={onDeleteNode}
          canDelete={nodes.length > 1}
          ancestors={new Set()}
        />
      ))}
    </div>
  );
};

interface TreeNodeItemProps {
  nodeId: number;
  nodesMap: Map<number, SongNode>;
  selectedNodeId: number;
  onSelectNode: (id: number) => void;
  onDeleteNode: (id: number) => void;
  canDelete: boolean;
  ancestors: Set<number>;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  nodeId,
  nodesMap,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
  canDelete,
  ancestors,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const node = nodesMap.get(nodeId);

  if (!node) return null;

  // Prevent infinite recursive rendering on cyclic node calls
  const isCycle = ancestors.has(nodeId);

  // Find child target node IDs called from this node
  const childNodeIds = Array.from(
    new Set(
      node.commands
        .filter((c) => c.type === 'CALL_NODE8' || c.type === 'CALL_NODE16')
        .map((c) => (c as any).targetNodeId)
    )
  );

  const hasChildren = childNodeIds.length > 0 && !isCycle;
  const isSelected = selectedNodeId === node.id;

  const displayName =
    node.name && node.name.trim() !== ''
      ? node.name
      : node.id === 999
        ? 'Main Track (999)'
        : `Node #${node.id}`;

  const nextAncestors = new Set(ancestors).add(nodeId);

  return (
    <div className="tree-node-wrapper">
      <div
        className={`tree-node-item ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelectNode(node.id)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
          {hasChildren ? (
            <button
              className="tree-chevron-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <div style={{ width: '18px' }} />
          )}

          <Hash size={13} color="#f9e2af" />
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          <span className="badge">{node.commands.length}</span>

          {isCycle && (
            <span className="loop-badge" title="Recursion loop detected">
              <Repeat size={10} style={{ display: 'inline', marginRight: '3px' }} /> loop
            </span>
          )}
        </div>

        {canDelete && (
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

      {hasChildren && isExpanded && (
        <div className="tree-children">
          {childNodeIds.map((childId) => (
            <TreeNodeItem
              key={`${nodeId}->${childId}`}
              nodeId={childId}
              nodesMap={nodesMap}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              onDeleteNode={onDeleteNode}
              canDelete={canDelete}
              ancestors={nextAncestors}
            />
          ))}
        </div>
      )}
    </div>
  );
};
