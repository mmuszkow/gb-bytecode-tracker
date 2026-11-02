import type { SongNode, Command } from '../types/gbsong';

export class GameBoyAudioPlayer {
    private ctx: AudioContext | null = null;
    private isPlaying: boolean = false;
    private timerId: number | null = null;

    // Execution state
    private nodes: Record<number, SongNode> = {};
    private currentCommands: Command[] = [];
    private pc: number = 0; // Program counter within current node
    private stack: { commands: Command[]; pc: number }[] = [];
    private vblankDelay: number = 0;

    // APU Channel Web Audio Nodes
    private ch1Osc: OscillatorNode | null = null;
    private ch1Gain: GainNode | null = null;

    private ch2Osc: OscillatorNode | null = null;
    private ch2Gain: GainNode | null = null;

    private noiseBufferNode: AudioBufferSourceNode | null = null;
    private noiseGain: GainNode | null = null;

    // Sound register state memory (0x00 to 0x2F)
    private registers: Uint8Array = new Uint8Array(0x30);

    public start(nodes: SongNode[], startNodeId: number = 0) {
        this.stop();

        // Map array into lookup dictionary
        this.nodes = {};
        nodes.forEach(n => { this.nodes[n.id] = n; });

        const startNode = this.nodes[startNodeId] || nodes[0];
        if (!startNode) return;

        // Initialize AudioContext on user interaction
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.setupChannels();

        // Reset playback state
        this.currentCommands = startNode.commands;
        this.pc = 0;
        this.stack = [];
        this.vblankDelay = 0;
        this.isPlaying = true;

        // Run execution loop at ~60Hz (GameBoy VBlank rate)
        this.timerId = window.setInterval(() => this.vblankTick(), 1000 / 59.73);
    }

    public stop() {
        this.isPlaying = false;
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.silenceAll();
    }

    // 60Hz Execution Loop (emulates snd_decompress & snd_update)
    private vblankTick() {
        if (!this.isPlaying) return;

        // If waiting out vblanks delay
        if (this.vblankDelay > 0) {
            this.vblankDelay--;
            return;
        }

        // Step through bytecode until hitting a DELAY or track END
        while (this.pc < this.currentCommands.length) {
            const cmd = this.currentCommands[this.pc++];

            switch (cmd.type) {
                case 'DELAY':
                    this.vblankDelay = cmd.delay; // 0 to 127 vblanks
                    return;

                case 'REGISTER_WRITE':
                    this.writeRegister(cmd.registerOffset, cmd.value);
                    break;

                case 'CALL_NODE8':
                case 'CALL_NODE16':
                    if (this.nodes[cmd.targetNodeId] && this.stack.length < 16) {
                        // Push current position to stack
                        this.stack.push({ commands: this.currentCommands, pc: this.pc });
                        this.currentCommands = this.nodes[cmd.targetNodeId].commands;
                        this.pc = 0;
                    }
                    break;

                case 'WAVE_RAM':
                    const wavePayload = (cmd as any).samples || [];
                    for (let idx = 0; idx < 16; idx++) {
                        const hwAddress = 0x20 + idx;
                        this.writeRegister(hwAddress, wavePayload[idx] ?? 0);
                    }
                    break;

                case 'RET':
                    if (this.stack.length > 0) {
                        const returnFrame = this.stack.pop()!;
                        this.currentCommands = returnFrame.commands;
                        this.pc = returnFrame.pc;
                    } else {
                        this.stop();
                        return;
                    }
                    break;

                case 'END':
                    this.stop();
                    return;
            }
        }

        // End of node without explicit RET/END
        if (this.stack.length > 0) {
            const returnFrame = this.stack.pop()!;
            this.currentCommands = returnFrame.commands;
            this.pc = returnFrame.pc;
        } else {
            this.stop();
        }
    }

    // GameBoy Hardware Register Interpreter
    private writeRegister(offset: number, val: number) {
        if (offset < 0 || offset >= 0x30) return;
        this.registers[offset] = val;

        if (!this.ctx) return;

        // --- Channel 1: Pulse 1 (Offsets 0x00 - 0x04) ---
        if (offset === 0x03 || offset === 0x04) {
            const freqRaw = this.registers[0x03] | ((this.registers[0x04] & 0x07) << 8);
            const freqHz = 131072 / (2048 - freqRaw); // GB Frequency Formula
            if (this.ch1Osc && isFinite(freqHz) && freqHz > 0) {
                this.ch1Osc.frequency.setValueAtTime(freqHz, this.ctx.currentTime);
            }
            // Trigger Note
            if (offset === 0x04 && (val & 0x80)) {
                const envVol = (this.registers[0x02] >> 4) / 15; // 4-bit envelope
                this.ch1Gain?.gain.setValueAtTime(envVol * 0.15, this.ctx.currentTime);
            }
        }

        // --- Channel 2: Pulse 2 (Offsets 0x06 - 0x09) ---
        if (offset === 0x08 || offset === 0x09) {
            const freqRaw = this.registers[0x08] | ((this.registers[0x09] & 0x07) << 8);
            const freqHz = 131072 / (2048 - freqRaw);
            if (this.ch2Osc && isFinite(freqHz) && freqHz > 0) {
                this.ch2Osc.frequency.setValueAtTime(freqHz, this.ctx.currentTime);
            }
            // Trigger Note
            if (offset === 0x09 && (val & 0x80)) {
                const envVol = (this.registers[0x07] >> 4) / 15;
                this.ch2Gain?.gain.setValueAtTime(envVol * 0.15, this.ctx.currentTime);
            }
        }

        // --- Channel 4: Noise (Offsets 0x10 - 0x13) ---
        if (offset === 0x13 && (val & 0x80)) {
            const envVol = (this.registers[0x11] >> 4) / 15;
            this.noiseGain?.gain.setValueAtTime(envVol * 0.1, this.ctx.currentTime);
        }

        // Master Sound Off (NR52 bit 7 clear)
        if (offset === 0x16 && !(val & 0x80)) {
            this.silenceAll();
        }
    }

    private setupChannels() {
        if (!this.ctx) return;

        // Ch1 Pulse Oscillator
        this.ch1Osc = this.ctx.createOscillator();
        this.ch1Osc.type = 'square';
        this.ch1Gain = this.ctx.createGain();
        this.ch1Gain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.ch1Osc.connect(this.ch1Gain);
        this.ch1Gain.connect(this.ctx.destination);
        this.ch1Osc.start();

        // Ch2 Pulse Oscillator
        this.ch2Osc = this.ctx.createOscillator();
        this.ch2Osc.type = 'square';
        this.ch2Gain = this.ctx.createGain();
        this.ch2Gain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.ch2Osc.connect(this.ch2Gain);
        this.ch2Gain.connect(this.ctx.destination);
        this.ch2Osc.start();

        // Ch4 Noise Channel (Generated PCM White Noise)
        const bufferSize = this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        this.noiseBufferNode = this.ctx.createBufferSource();
        this.noiseBufferNode.buffer = noiseBuffer;
        this.noiseBufferNode.loop = true;
        this.noiseGain = this.ctx.createGain();
        this.noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.noiseBufferNode.connect(this.noiseGain);
        this.noiseGain.connect(this.ctx.destination);
        this.noiseBufferNode.start();
    }

    private silenceAll() {
        if (this.ctx) {
            this.ch1Gain?.gain.setValueAtTime(0, this.ctx.currentTime);
            this.ch2Gain?.gain.setValueAtTime(0, this.ctx.currentTime);
            this.noiseGain?.gain.setValueAtTime(0, this.ctx.currentTime);
        }
    }
}

export const player = new GameBoyAudioPlayer();
