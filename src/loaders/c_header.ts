import type { SongNode, Command } from '../types/gbsong';

export interface ParseResult {
    nodes: SongNode[];
    mainNodeId: number;
}

/**
 * Parses GameBoy C Header files (.h).
 * Handles byte arrays with comments, trailing values, and compressed or uncompressed formats.
 */
export function parseCHeader(cCode: string): ParseResult {
    // 1. Strip C-style multiline (/* ... */) and single line (// ...) comments
    const cleanCode = cCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

    // 2. Extract raw bytes from array initialization (UINT8, uint8_t, unsigned char)
    const arrayRegex = /(?:UINT8|uint8_t|unsigned\s+char)\s+\w+\s*\[[^\]]*]\s*=\s*\{([^}]*)}/i;
    const dataMatch = cleanCode.match(arrayRegex);

    if (!dataMatch) {
        throw new Error('Could not find byte array (e.g., UINT8 SND_SONG0[]) in C header.');
    }

    // Extract all hex (0x80) or decimal numbers
    const rawByteStrings = dataMatch[1].match(/0x[0-9a-fA-F]{1,2}|\b\d+\b/g) || [];
    const bytes = rawByteStrings.map(b => parseInt(b, b.toLowerCase().startsWith('0x') ? 16 : 10));

    if (bytes.length === 0) {
        throw new Error('Found byte array, but no valid byte values were extracted.');
    }

    // 3. Extract subroutine node pointers from SONG_NODES array (if present)
    const nodesRegex = /(?:UINT8|uint8_t|unsigned\s+char)\s*\*\s*(?:const\s+)?\w+\s*\[[^\]]*]\s*=\s*\{([^}]*)}/i;
    const nodesMatch = cleanCode.match(nodesRegex);
    const nodeOffsets: number[] = [];

    if (nodesMatch) {
        const pointerRegex = /&\w+\[\s*(\d+)\s*]/g;
        let match: RegExpExecArray | null;
        while ((match = pointerRegex.exec(nodesMatch[1])) !== null) {
            nodeOffsets.push(parseInt(match[1], 10));
        }
    }

    const nodes: SongNode[] = [];

    // Fallback: No node pointers found -> single track at Node #0
    if (nodeOffsets.length === 0) {
        nodes.push({
            id: 0,
            commands: disassembleBytes(bytes)
        });
        return { nodes, mainNodeId: 0 };
    }

    // Compressed format: Slice Main Track (byte 0 to first node offset)
    const MAIN_TRACK_ID = 999;
    if (nodeOffsets[0] > 0) {
        nodes.push({
            id: MAIN_TRACK_ID,
            commands: disassembleBytes(bytes.slice(0, nodeOffsets[0]))
        });
    }

    // Slice each Subroutine Node
    for (let i = 0; i < nodeOffsets.length; i++) {
        const start = nodeOffsets[i];
        const end = i < nodeOffsets.length - 1 ? nodeOffsets[i + 1] : bytes.length;
        nodes.push({
            id: i,
            commands: disassembleBytes(bytes.slice(start, end))
        });
    }

    return {
        nodes,
        mainNodeId: nodeOffsets[0] > 0 ? MAIN_TRACK_ID : 0
    };
}

/**
 * Disassembles GameBoy bytecode slice into typed Commands.
 */
function disassembleBytes(bytes: number[]): Command[] {
    const commands: Command[] = [];
    let i = 0;

    while (i < bytes.length) {
        const b = bytes[i];
        const cmdId = `cmd-${i}-${Math.random().toString(36).substring(2, 6)}`;

        if (b < 0x80) {
            // Delay command (0x00 to 0x7F)
            commands.push({
                id: cmdId,
                type: 'DELAY',
                delay: b
            });
            i += 1;
        } else if (b === 0xFA) {
            // Call Node 16-bit (0xFA + 2 bytes target ID)
            const targetNodeId = (bytes[i + 1] ?? 0) | ((bytes[i + 2] ?? 0) << 8);
            commands.push({
                id: cmdId,
                type: 'CALL_NODE16',
                targetNodeId
            });
            i += 3;
        } else if (b === 0xFB) {
            // Call Node 8-bit (0xFB + 1 byte target ID)
            const targetNodeId = bytes[i + 1] ?? 0;
            commands.push({
                id: cmdId,
                type: 'CALL_NODE8',
                targetNodeId
            });
            i += 2;
        } else if (b === 0xFC) {
            // Return command
            commands.push({ id: cmdId, type: 'RET' });
            i += 1;
        } else if (b === 0xFF) {
            // End of track command
            commands.push({ id: cmdId, type: 'END' });
            i += 1;
        } else if (b >= 0x80 && b < 0xFA) {
            // Register Write (Offset = b - 0x80, next byte = value)
            const registerOffset = b - 0x80;
            const value = bytes[i + 1] ?? 0;
            commands.push({
                id: cmdId,
                type: 'REGISTER_WRITE',
                registerOffset,
                value
            });
            i += 2;
        } else {
            // Skip unknown or incomplete byte safely
            i += 1;
        }
    }

    return commands;
}
