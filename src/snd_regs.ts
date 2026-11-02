import type {Command, SongNode} from "./types/gbsong.ts";

// Game Boy Sound Registers mapped by relative offset from NR10 (cmd - 0x80)
// Formula: relative_offset = (Absolute IO Address relative to 0xFF00) - 0x10
export const GB_REGISTERS: Record<number, string> = {
    0x00: 'NR10 (Ch1 Sweep)',
    0x01: 'NR11 (Ch1 Length/Duty)',
    0x02: 'NR12 (Ch1 Envelope)',
    0x03: 'NR13 (Ch1 Freq Lo)',
    0x04: 'NR14 (Ch1 Freq Hi/Trigger)',
    // 0x05 is unmapped (0xFF15)
    0x06: 'NR21 (Ch2 Length/Duty)',
    0x07: 'NR22 (Ch2 Envelope)',
    0x08: 'NR23 (Ch2 Freq Lo)',
    0x09: 'NR24 (Ch2 Freq Hi/Trigger)',
    0x0A: 'NR30 (Ch3 Sound On/Off)',
    0x0B: 'NR31 (Ch3 Sound Length)',
    0x0C: 'NR32 (Ch3 Output Level)',
    0x0D: 'NR33 (Ch3 Freq Lo)',
    0x0E: 'NR34 (Ch3 Freq Hi/Trigger)',
    // 0x0F is unmapped (0xFF1F)
    0x10: 'NR41 (Ch4 Sound Length)',
    0x11: 'NR42 (Ch4 Envelope)',
    0x12: 'NR43 (Ch4 Polynomial Counter)',
    0x13: 'NR44 (Ch4 Counter/Initial)',
    0x14: 'NR50 (Master Volume/Pan)',
    0x15: 'NR51 (Sound Output Terminal)',
    0x16: 'NR52 (Sound On/Off)',
    // 0x17 to 0x1F are unmapped (0xFF27 - 0xFF2F)
    0x20: 'WAVE_RAM[0]',
    0x21: 'WAVE_RAM[1]',
    0x22: 'WAVE_RAM[2]',
    0x23: 'WAVE_RAM[3]',
    0x24: 'WAVE_RAM[4]',
    0x25: 'WAVE_RAM[5]',
    0x26: 'WAVE_RAM[6]',
    0x27: 'WAVE_RAM[7]',
    0x28: 'WAVE_RAM[8]',
    0x29: 'WAVE_RAM[9]',
    0x2A: 'WAVE_RAM[10]',
    0x2B: 'WAVE_RAM[11]',
    0x2C: 'WAVE_RAM[12]',
    0x2D: 'WAVE_RAM[13]',
    0x2E: 'WAVE_RAM[14]',
    0x2F: 'WAVE_RAM[15]',
};

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
        case 'WAVE_RAM':
            return `0xFE (16 bytes)`;
        case 'RET':
            return `0xFC`;
        case 'END':
            return `0xFF`;
        default:
            return '0x00';
    }
}

export function getCommandValidationError(cmd: Command, nodes: SongNode[]): string | null {
    if (cmd.type === 'DELAY') {
        if (cmd.delay < 0 || cmd.delay > 127 || !Number.isInteger(cmd.delay)) {
            return 'Delay must be an integer between 0 and 127 vblanks (0x00 - 0x7F).';
        }
    }
    if (cmd.type === 'REGISTER_WRITE') {
        if (!(cmd.registerOffset in GB_REGISTERS)) {
            return `Invalid register offset 0x${cmd.registerOffset.toString(16).padStart(2, '0').toUpperCase()} (unmapped hardware register).`;
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
