import type { Command } from '../types/command.ts';
import type {SongNode} from "../types/song_node.ts";

export function exportCHeader(nodes: SongNode[], songName: string = 'SONG0'): string {
    // Sort nodes: Main track (ID 999) first, then subroutine nodes ordered by ID
    const mainTrack = nodes.find(n => n.id === 999);
    const subNodes = nodes.filter(n => n.id !== 999).sort((a, b) => a.id - b.id);

    const bytes: number[] = [];
    const nodePointerOffsets: { id: number; offset: number; name?: string }[] = [];

    // 1. Serialize Main Track if present
    if (mainTrack) {
        bytes.push(...serializeCommands(mainTrack.commands));
    }

    // 2. Serialize Subroutines and record starting byte offsets
    for (const node of subNodes) {
        nodePointerOffsets.push({
            id: node.id,
            offset: bytes.length,
            name: getCustomName(node)
        });
        bytes.push(...serializeCommands(node.commands));
    }

    // Format bytes into lines of 12 hex values
    const formattedDataLines: string[] = [];
    for (let i = 0; i < bytes.length; i += 12) {
        const chunk = bytes.slice(i, i + 12);
        const hexChunk = chunk.map(b => `0x${b.toString(16).padStart(2, '0').toUpperCase()}`).join(', ');
        formattedDataLines.push(`    ${hexChunk},`);
    }

    // Format node pointers with optional custom name comments
    const formattedNodeLines: string[] = [];
    for (let i = 0; i < nodePointerOffsets.length; i++) {
        const p = nodePointerOffsets[i];
        const comment = p.name ? ` /* ${p.name} */` : '';
        const isLast = i === nodePointerOffsets.length - 1;
        formattedNodeLines.push(`    &${songName}_DATA[${p.offset}]${isLast ? '' : ','}${comment}`);
    }

    return `#ifndef __SND_${songName}_H__
#define __SND_${songName}_H__

#include <gb/gb.h>

/* Total data size: ${bytes.length} bytes */
const UINT8 ${songName}_DATA[${bytes.length}] = {
${formattedDataLines.join('\n')}
};

${nodePointerOffsets.length > 0 ? `const UINT8* const ${songName}_NODES[${nodePointerOffsets.length}] = {
${formattedNodeLines.join('\n')}
};` : ''}

#endif
`;
}

function serializeCommands(commands: Command[]): number[] {
    const bytes: number[] = [];
    for (const cmd of commands) {
        switch (cmd.type) {
            case 'DELAY':
                bytes.push(Math.max(0, Math.min(127, cmd.delay)));
                break;
            case 'REGISTER_WRITE':
                bytes.push((cmd.registerOffset + 0x80) & 0xFF);
                bytes.push(cmd.value & 0xFF);
                break;
            case 'CALL_NODE8':
                bytes.push(0xFB);
                bytes.push(cmd.targetNodeId & 0xFF);
                break;
            case 'CALL_NODE16':
                bytes.push(0xFA);
                bytes.push(cmd.targetNodeId & 0xFF);
                bytes.push((cmd.targetNodeId >> 8) & 0xFF);
                break;
            case 'WAVE_RAM':
                bytes.push(0xFE);
                const payload = cmd.samples || new Array(16).fill(0);
                for (let k = 0; k < 16; k++) {
                    bytes.push((payload[k] ?? 0) & 0xFF);
                }
                break;
            case 'RET':
                bytes.push(0xFC);
                break;
            case 'END':
                bytes.push(0xFF);
                break;
        }
    }
    return bytes;
}

function getCustomName(node: SongNode): string | undefined {
    if (!node.name || !node.name.trim()) return undefined;
    const defaultName = node.id === 999 ? 'Main Track' : `Node #${node.id}`;
    if (node.name.trim() === defaultName || node.name.trim() === 'Main Track (999)') return undefined;
    return node.name.trim();
}
