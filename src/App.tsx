import {useState} from "react";
import type { SongNode, Command } from './types/gbsong';
import './App.css';
import CommandEditor from "./components/CommandEditor.tsx";
import ImportModal from "./components/ImportModal.tsx";
import Sidebar from "./components/Sidebar.tsx";

const INITIAL_NODES: SongNode[] = [
  {
    id: 0,
    commands: [
      { id: 'c-1', type: 'REGISTER_WRITE', registerOffset: 0x02, value: 0xF3 },
      { id: 'c-2', type: 'REGISTER_WRITE', registerOffset: 0x03, value: 0x83 },
      { id: 'c-3', type: 'REGISTER_WRITE', registerOffset: 0x04, value: 0x87 },
      { id: 'c-4', type: 'DELAY', delay: 16 },
      { id: 'c-5', type: 'CALL_NODE8', targetNodeId: 1 },
      { id: 'c-6', type: 'END' }
    ]
  },
  {
    id: 1,
    commands: [
      { id: 'c-7', type: 'REGISTER_WRITE', registerOffset: 0x03, value: 0xC1 },
      { id: 'c-8', type: 'REGISTER_WRITE', registerOffset: 0x04, value: 0x87 },
      { id: 'c-9', type: 'DELAY', delay: 8 },
      { id: 'c-10', type: 'RET' }
    ]
  }
];

export default function App() {
  const [nodes, setNodes] = useState<SongNode[]>(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<number>(0);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  // --- Node Actions ---
  const addNode = () => {
    const nextId = nodes.length > 0 ? Math.max(...nodes.map((n) => n.id)) + 1 : 0;
    const newNode: SongNode = {
      id: nextId,
      commands: [{ id: `cmd-${Date.now()}`, type: 'RET' }]
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(nextId);
  };

  const deleteNode = (id: number) => {
    if (nodes.length <= 1) return;
    const filtered = nodes.filter((n) => n.id !== id);
    setNodes(filtered);
    if (selectedNodeId === id) setSelectedNodeId(filtered[0].id);
  };

  // --- Command Actions ---
  const addCommand = (nodeId: number, type: Command['type']) => {
    const id = `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let newCmd: Command;

    switch (type) {
      case 'DELAY':
        newCmd = { id, type: 'DELAY', delay: 10 };
        break;
      case 'REGISTER_WRITE':
        newCmd = { id, type: 'REGISTER_WRITE', registerOffset: 0x00, value: 0x00 };
        break;
      case 'CALL_NODE8':
      case 'CALL_NODE16':
        const otherNode = nodes.find((n) => n.id !== nodeId);
        newCmd = { id, type, targetNodeId: otherNode ? otherNode.id : nodeId };
        break;
      case 'RET':
        newCmd = { id, type: 'RET' };
        break;
      case 'END':
        newCmd = { id, type: 'END' };
        break;
      default:
        return;
    }

    setNodes((prev) =>
        prev.map((node) => (node.id === nodeId ? { ...node, commands: [...node.commands, newCmd] } : node))
    );
  };

  const updateCommand = (nodeId: number, commandId: string, updatedFields: Partial<Command>) => {
    setNodes((prev) =>
        prev.map((node) => {
          if (node.id !== nodeId) return node;
          return {
            ...node,
            commands: node.commands.map((cmd) => (cmd.id === commandId ? ({ ...cmd, ...updatedFields } as Command) : cmd))
          };
        })
    );
  };

  const deleteCommand = (nodeId: number, commandId: string) => {
    setNodes((prev) =>
        prev.map((node) =>
            node.id === nodeId ? { ...node, commands: node.commands.filter((c) => c.id !== commandId) } : node
        )
    );
  };

  const moveCommand = (nodeId: number, index: number, direction: -1 | 1) => {
    setNodes((prev) =>
        prev.map((node) => {
          if (node.id !== nodeId) return node;
          const targetIndex = index + direction;
          if (targetIndex < 0 || targetIndex >= node.commands.length) return node;

          const newCommands = [...node.commands];
          const temp = newCommands[index];
          newCommands[index] = newCommands[targetIndex];
          newCommands[targetIndex] = temp;

          return { ...node, commands: newCommands };
        })
    );
  };

  return (
      <div className="app-container">
        <Sidebar
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onAddNode={addNode}
            onDeleteNode={deleteNode}
            onOpenImport={() => setShowImportModal(true)}
        />

        {selectedNode ? (
            <CommandEditor
                selectedNode={selectedNode}
                nodes={nodes}
                onAddCommand={(type) => addCommand(selectedNode.id, type)}
                onUpdateCommand={(cmdId, fields) => updateCommand(selectedNode.id, cmdId, fields)}
                onDeleteCommand={(cmdId) => deleteCommand(selectedNode.id, cmdId)}
                onMoveCommand={(idx, dir) => moveCommand(selectedNode.id, idx, dir)}
            />
        ) : (
            <div className="main-content">Select or create a node to edit.</div>
        )}

        <ImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImportSuccess={(parsedNodes, mainNodeId) => {
              setNodes(parsedNodes);
              setSelectedNodeId(mainNodeId);
            }}
        />
      </div>
  );
}
