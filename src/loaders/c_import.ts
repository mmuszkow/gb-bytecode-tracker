import type { Command } from '../types/command.ts';
import type {SongNode} from "../types/song_node.ts";

export interface ParseResult {
    nodes: SongNode[];
    mainNodeId: number;
}

interface PointerInfo {
    offset: number;
    name?: string;
}

export function parseCHeader(cCode: string): ParseResult {
    // 1. Extract node pointers AND comments BEFORE stripping multiline comments
    const nodesRegex = /(?:UINT8|uint8_t|unsigned\s+char)\s*\*\s*(?:const\s+)?\w+\s*\[[^\]]*]\s*=\s*\{([^}]*)}/i;
    const nodesMatch = cCode.match(nodesRegex);
    const nodePointers: PointerInfo[] = [];

    if (nodesMatch) {
        const pointerRegex = /&\w+\[\s*(\d+)\s*](?:\s*,?\s*\/\*\s*(.*?)\s*\*\/)?(?:\s*,)?/g;
        let match: RegExpExecArray | null;
        while ((match = pointerRegex.exec(nodesMatch[1])) !== null) {
            const offset = parseInt(match[1], 10);
            const rawComment = match[2] ? match[2].trim() : undefined;
            nodePointers.push({
                offset,
                name: rawComment && rawComment.length > 0 ? rawComment : undefined
            });
        }
    }

    // 2. Strip C-style comments for byte parsing
    const cleanCode = cCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

    const arrayRegex = /(?:UINT8|uint8_t|unsigned\s+char)\s+\w+\s*\[[^\]]*]\s*=\s*\{([^}]*)}/i;
    const dataMatch = cleanCode.match(arrayRegex);

    if (!dataMatch) {
        throw new Error('Could not find byte array in C header.');
    }

    const rawByteStrings = dataMatch[1].match(/0x[0-9a-fA-F]{1,2}|\b\d+\b/g) || [];
    const bytes = rawByteStrings.map(b => parseInt(b, b.toLowerCase().startsWith('0x') ? 16 : 10));

    if (bytes.length === 0) {
        throw new Error('Found byte array, but no valid byte values were extracted.');
    }

    const nodes: SongNode[] = [];

    if (nodePointers.length === 0) {
        nodes.push({ id: 0, name: 'Main Track', commands: disassembleBytes(bytes) });
        return { nodes, mainNodeId: 0 };
    }

    const MAIN_TRACK_ID = 999;
    if (nodePointers[0].offset > 0) {
        nodes.push({
            id: MAIN_TRACK_ID,
            name: 'Main Track',
            commands: disassembleBytes(bytes.slice(0, nodePointers[0].offset))
        });
    }

    for (let i = 0; i < nodePointers.length; i++) {
        const start = nodePointers[i].offset;
        const end = i < nodePointers.length - 1 ? nodePointers[i + 1].offset : bytes.length;
        nodes.push({
            id: i,
            name: nodePointers[i].name || `Node #${i}`,
            commands: disassembleBytes(bytes.slice(start, end))
        });
    }

    return {
        nodes,
        mainNodeId: nodePointers[0].offset > 0 ? MAIN_TRACK_ID : 0
    };
}

function disassembleBytes(bytes: number[]): Command[] {
    const commands: Command[] = [];
    let i = 0;
    while (i < bytes.length) {
        const b = bytes[i];
        const cmdId = `cmd-${i}-${Math.random().toString(36).substring(2, 6)}`;

        if (b < 0x80) {
            commands.push({ id: cmdId, type: 'DELAY', delay: b });
            i += 1;
        } else if (b === 0xFA) {
            const targetNodeId = (bytes[i + 1] ?? 0) | ((bytes[i + 2] ?? 0) << 8);
            commands.push({ id: cmdId, type: 'CALL_NODE16', targetNodeId });
            i += 3;
        } else if (b === 0xFB) {
            const targetNodeId = bytes[i + 1] ?? 0;
            commands.push({ id: cmdId, type: 'CALL_NODE8', targetNodeId });
            i += 2;
        } else if (b === 0xFC) {
            commands.push({ id: cmdId, type: 'RET' });
            i += 1;
        } else if (b === 0xFE) { // CMD_WAVE_RAM (1 opcode + 16 sample bytes = 17 bytes)
            const samples = bytes.slice(i + 1, i + 17);
            commands.push({ id: cmdId, type: 'WAVE_RAM', samples });
            i += 17; // Skip opcode + 16 sample bytes
        } else if (b === 0xFF) {
            commands.push({ id: cmdId, type: 'END' });
            i += 1;
        } else if (b >= 0x80 && b < 0xFA) {
            const registerOffset = b - 0x80;
            const value = bytes[i + 1] ?? 0;
            commands.push({ id: cmdId, type: 'REGISTER_WRITE', registerOffset, value });
            i += 2;
        } else {
            i += 1;
        }
    }
    return commands;
}
