import type {Command} from "./types/gbsong.ts";

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
