import type {Command} from "./command.ts";

export interface SongNode {
    id: number;
    name?: string;
    commands: Command[];
}
