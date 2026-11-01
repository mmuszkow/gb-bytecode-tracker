import type {Command, SongNode} from './types/gbsong';

// GameBoy Hardware Sound Register Mapping (Offset relative to 0xFF10 / NR10)
export const GB_REGISTERS: Record<number, string> = {
    0x00: 'NR10 - Ch1 Sweep',
    0x01: 'NR11 - Ch1 Duty / Sound Length',
    0x02: 'NR12 - Ch1 Envelope',
    0x03: 'NR13 - Ch1 Frequency Low',
    0x04: 'NR14 - Ch1 Frequency High / Control',
    0x06: 'NR21 - Ch2 Duty / Sound Length',
    0x07: 'NR22 - Ch2 Envelope',
    0x08: 'NR23 - Ch2 Frequency Low',
    0x09: 'NR24 - Ch2 Frequency High / Control',
    0x0B: 'NR30 - Ch3 Sound On/Off',
    0x0C: 'NR31 - Ch3 Sound Length',
    0x0D: 'NR32 - Ch3 Output Level',
    0x0E: 'NR33 - Ch3 Frequency Low',
    0x0F: 'NR34 - Ch3 Frequency High / Control',
    0x11: 'NR41 - Ch4 Sound Length',
    0x12: 'NR42 - Ch4 Envelope',
    0x13: 'NR43 - Ch4 Polynomial Noise',
    0x14: 'NR44 - Ch4 Counter / Control',
    0x16: 'NR50 - Master Volume / Vin',
    0x17: 'NR51 - Channel Panning',
    0x18: 'NR52 - Master Sound On/Off',
};

// Formats commands into hexadecimal string preview
export function formatCommandHex(cmd: Command): string {
    switch (cmd.type) {
        case 'DELAY':
            return `0x${cmd.delay.toString(16).padStart(2, '0').toUpperCase()}`;
        case 'REGISTER_WRITE':
            const regByte = (cmd.registerOffset + 0x80).toString(16).padStart(2, '0').toUpperCase();
            const valByte = cmd.value.toString(16).padStart(2, '0').toUpperCase();
            return `0x${regByte} 0x${valByte}`;
        case 'CALL_NODE8':
            return `0xFB [Node #${cmd.targetNodeId}]`;
        case 'CALL_NODE16':
            return `0xFA [Node #${cmd.targetNodeId}]`;
        case 'RET':
            return `0xFC`;
        case 'END':
            return `0xFF`;
        default:
            return '0x00';
    }
}

// Validation logic for individual commands
export function getValidationError(cmd: Command, nodes: SongNode[]): string | null {
    if (cmd.type === 'DELAY') {
        if (cmd.delay < 1 || cmd.delay > 127 || !Number.isInteger(cmd.delay)) {
            return 'Delay must be an integer between 1 and 127 vblanks (< 0x80).';
        }
    }
    if (cmd.type === 'REGISTER_WRITE') {
        if (cmd.registerOffset < 0x00 || cmd.registerOffset > 0x26) {
            return 'Register offset out of bounds (0x00 - 0x26).';
        }
        if (cmd.value < 0x00 || cmd.value > 0xFF) {
            return 'Value out of byte range (0x00 - 0xFF).';
        }
    }
    if (cmd.type === 'CALL_NODE8' || cmd.type === 'CALL_NODE16') {
        const exists = nodes.some(n => n.id === cmd.targetNodeId);
        if (!exists) return `Target Node #${cmd.targetNodeId} does not exist.`;
    }
    return null;
}

// Background colors for command labels
export function getTypeColor(type: Command['type']): string {
    switch (type) {
        case 'DELAY': return '#89b4fa';
        case 'REGISTER_WRITE': return '#a6e3a1';
        case 'CALL_NODE8':
        case 'CALL_NODE16': return '#f9e2af';
        case 'RET': return '#cba6f7';
        case 'END': return '#f38ba8';
        default: return '#45475a';
    }
}
