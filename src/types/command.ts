import { GB_REGISTERS } from '../snd_regs.ts';
import type { SongNode } from './song_node.ts';

export type CommandType =
  'DELAY' | 'REGISTER_WRITE' | 'CALL_NODE8' | 'CALL_NODE16' | 'WAVE_RAM' | 'RET' | 'END';

export interface BaseCommand {
  id: string;
  type: CommandType;
}

export interface DelayCommand extends BaseCommand {
  type: 'DELAY';
  delay: number; // < 0x80 (1 to 127)
}

export interface RegisterCommand extends BaseCommand {
  type: 'REGISTER_WRITE';
  registerOffset: number; // 0x00 to 0x26 (NR10 is offset 0x00)
  value: number; // byte value 0x00 to 0xFF
}

export interface CallNodeCommand extends BaseCommand {
  type: 'CALL_NODE8' | 'CALL_NODE16';
  targetNodeId: number;
}

export interface WaveRamCommand extends BaseCommand {
  type: 'WAVE_RAM';
  samples: number[]; // 16 of them
}

export interface ReturnCommand extends BaseCommand {
  type: 'RET'; // 0xFC
}

export interface EndCommand extends BaseCommand {
  type: 'END'; // 0xFF
}

export type Command =
  DelayCommand | RegisterCommand | CallNodeCommand | WaveRamCommand | ReturnCommand | EndCommand;

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
    if (cmd.value < 0x00 || cmd.value > 0xff) {
      return 'Value out of byte range (0x00 - 0xFF).';
    }
  }
  if (cmd.type === 'CALL_NODE8' || cmd.type === 'CALL_NODE16') {
    const exists = nodes.some((n) => n.id === cmd.targetNodeId);
    if (!exists) return `Target Node #${cmd.targetNodeId} does not exist.`;
  }
  return null;
}
