import { useState } from 'react';
import type { Command } from '../types/command.ts';
import type {SongNode} from "../types/song_node.ts";

const INITIAL_NODES: SongNode[] = [
    {
        id: 0,
        name: 'Intro Pattern',
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
        name: 'Subroutine Arp',
        commands: [
            { id: 'c-7', type: 'REGISTER_WRITE', registerOffset: 0x03, value: 0xC1 },
            { id: 'c-8', type: 'REGISTER_WRITE', registerOffset: 0x04, value: 0x87 },
            { id: 'c-9', type: 'DELAY', delay: 8 },
            { id: 'c-10', type: 'RET' }
        ]
    }
];

export function useSongEditor(initialNodes: SongNode[] = INITIAL_NODES) {
    const [nodes, setNodes] = useState<SongNode[]>(initialNodes);
    const [selectedNodeId, setSelectedNodeId] = useState<number>(0);

    const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

    // Node Actions
    const addNode = () => {
        const nextId = nodes.length > 0 ? Math.max(...nodes.map((n) => n.id)) + 1 : 0;
        const newNode: SongNode = {
            id: nextId,
            name: `Node #${nextId}`,
            commands: [{ id: `cmd-${Date.now()}`, type: 'RET' }]
        };
        setNodes((prev) => [...prev, newNode]);
        setSelectedNodeId(nextId);
    };

    const updateNodeName = (nodeId: number, name: string) => {
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, name } : n)));
    };

    const deleteNode = (id: number) => {
        if (nodes.length <= 1) return;
        const filtered = nodes.filter((n) => n.id !== id);
        setNodes(filtered);
        if (selectedNodeId === id) setSelectedNodeId(filtered[0].id);
    };

    const loadImportedSong = (parsedNodes: SongNode[], mainNodeId: number) => {
        setNodes(parsedNodes);
        setSelectedNodeId(mainNodeId);
    };

    // Command Actions
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

    return {
        nodes,
        selectedNodeId,
        selectedNode,
        setSelectedNodeId,
        addNode,
        updateNodeName,
        deleteNode,
        loadImportedSong,
        addCommand,
        updateCommand,
        deleteCommand,
        moveCommand
    };
}
