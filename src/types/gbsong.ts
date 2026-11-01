export type CommandType = 'DELAY' | 'REGISTER_WRITE' | 'CALL_NODE8' | 'CALL_NODE16' | 'WAVE_RAM' | 'RET' | 'END';

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

export interface ReturnCommand extends BaseCommand {
    type: 'RET'; // 0xFC
}

export interface EndCommand extends BaseCommand {
    type: 'END'; // 0xFF
}

export type Command = DelayCommand | RegisterCommand | CallNodeCommand | ReturnCommand | EndCommand;

export interface SongNode {
    id: number;
    commands: Command[];
}
