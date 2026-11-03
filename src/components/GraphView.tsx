import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, type Edge, type Node, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomSongNode } from './graph/CustomSongNode';
import type { SongNode } from '../types/song_node.ts';

interface GraphViewProps {
  nodes: SongNode[];
  selectedNodeId: number;
  onSelectNode: (id: number) => void;
}

const nodeTypes = { songNode: CustomSongNode };

// Layout Spacing Constants
const NODE_WIDTH = 220;
const NODE_HEIGHT = 160;
const SPACING_X = 60; // Horizontal gap between sibling nodes
const SPACING_Y = 100; // Vertical gap between caller and subroutine layers

export const GraphView: React.FC<GraphViewProps> = ({ nodes, selectedNodeId, onSelectNode }) => {
  const { flowNodes, flowEdges } = useMemo(() => {
    const edges: Edge[] = [];
    const adj = new Map<number, number[]>();
    const inDegree = new Map<number, number>();

    nodes.forEach((n) => {
      adj.set(n.id, []);
      if (!inDegree.has(n.id)) inDegree.set(n.id, 0);
    });

    // 1. Build adjacency list & directed edges
    nodes.forEach((node) => {
      const targets = new Set<number>();
      node.commands.forEach((cmd) => {
        if (cmd.type === 'CALL_NODE8' || cmd.type === 'CALL_NODE16') {
          targets.add(cmd.targetNodeId);
        }
      });

      targets.forEach((targetId) => {
        if (adj.has(node.id)) {
          adj.get(node.id)!.push(targetId);
        }
        inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);

        edges.push({
          id: `edge-${node.id}->${targetId}`,
          source: node.id.toString(),
          target: targetId.toString(),
          animated: true,
          style: { stroke: '#89b4fa', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#89b4fa',
          },
        });
      });
    });

    // 2. Compute depth layers for each node (BFS from root nodes)
    const nodeLevels = new Map<number, number>();
    const visited = new Set<number>();

    // Root nodes are nodes with in-degree 0 (or Main Track 999/0)
    let roots = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
    if (roots.length === 0 && nodes.length > 0) roots = [nodes[0].id];

    const queue: { id: number; level: number }[] = roots.map((id) => ({ id, level: 0 }));
    queue.forEach(({ id }) => {
      nodeLevels.set(id, 0);
      visited.add(id);
    });

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      const neighbors = adj.get(id) || [];

      for (const nextId of neighbors) {
        if (!visited.has(nextId)) {
          visited.add(nextId);
          nodeLevels.set(nextId, level + 1);
          queue.push({ id: nextId, level: level + 1 });
        }
      }
    }

    // Assign level 0 to any orphan / disconnected nodes
    nodes.forEach((n) => {
      if (!nodeLevels.has(n.id)) {
        nodeLevels.set(n.id, 0);
      }
    });

    // 3. Group nodes by level to assign (X, Y) coordinates
    const levelsMap = new Map<number, number[]>();
    nodeLevels.forEach((level, nodeId) => {
      if (!levelsMap.has(level)) levelsMap.set(level, []);
      levelsMap.get(level)!.push(nodeId);
    });

    const flowNodes: Node[] = [];
    nodes.forEach((node) => {
      const level = nodeLevels.get(node.id) || 0;
      const nodesInLevel = levelsMap.get(level) || [node.id];
      const indexInLevel = nodesInLevel.indexOf(node.id);

      // Center the nodes horizontally within their layer level
      const totalWidth = nodesInLevel.length * NODE_WIDTH + (nodesInLevel.length - 1) * SPACING_X;
      const startX = -totalWidth / 2;

      const posX = startX + indexInLevel * (NODE_WIDTH + SPACING_X);
      const posY = level * (NODE_HEIGHT + SPACING_Y);

      flowNodes.push({
        id: node.id.toString(),
        type: 'songNode',
        position: { x: posX, y: posY },
        data: {
          node,
          isSelected: selectedNodeId === node.id,
          onSelect: onSelectNode,
        },
      });
    });

    return { flowNodes, flowEdges: edges };
  }, [nodes, selectedNodeId, onSelectNode]);

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#11111b' }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
      >
        <Background color="#313244" gap={18} />
        <Controls
          style={{ backgroundColor: '#1e1e2e', fill: '#cdd6f4', border: '1px solid #313244' }}
        />
      </ReactFlow>
    </div>
  );
};
