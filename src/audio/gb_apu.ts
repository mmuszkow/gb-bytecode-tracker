/**
 * GameBoy APU Emulation Core in Pure TypeScript (Web Audio API driven)
 */
export class GameBoyAPU {
  public audioCtx: AudioContext;

  // 64 Byte Hardware Register Map (0xFF10 to 0xFF3F)
  private registers = new Uint8Array(0x40);

  // Master Gain & Panning
  private masterGainL: GainNode;
  private masterGainR: GainNode;
  //private merger: ChannelMergerNode;

  // --- Channel 1: Pulse 1 with Sweep ---
  private ch1Osc: OscillatorNode | null = null;
  private ch1Gain: GainNode | null = null;
  private ch1Panner: StereoPannerNode;
  private ch1FreqLo = 0;
  private ch1Vol = 0;
  private ch1EnvTimer: number | null = null;
  private ch1SweepTimer: number | null = null;

  // --- Channel 2: Pulse 2 ---
  private ch2Osc: OscillatorNode | null = null;
  private ch2Gain: GainNode | null = null;
  private ch2Panner: StereoPannerNode;
  private ch2FreqLo = 0;
  private ch2Vol = 0;
  private ch2EnvTimer: number | null = null;

  // --- Channel 3: Wave RAM ---
  private ch3Src: AudioBufferSourceNode | null = null;
  private ch3Gain: GainNode | null = null;
  private ch3Panner: StereoPannerNode;
  private ch3FreqLo = 0;
  private waveBuffer: AudioBuffer;

  // --- Channel 4: Noise ---
  private ch4Src: AudioBufferSourceNode | null = null;
  private ch4Gain: GainNode | null = null;
  private ch4Panner: StereoPannerNode;
  private ch4Vol = 0;
  private ch4EnvTimer: number | null = null;
  private noise7BitBuffer: AudioBuffer;
  private noise15BitBuffer: AudioBuffer;

  constructor() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtx();

    // Master Stereo Routing
    //this.merger = this.audioCtx.createChannelMerger(2);
    this.masterGainL = this.audioCtx.createGain();
    this.masterGainR = this.audioCtx.createGain();

    this.masterGainL.connect(this.audioCtx.destination);
    this.masterGainR.connect(this.audioCtx.destination);

    // Individual Channel Panners
    this.ch1Panner = this.audioCtx.createStereoPanner();
    this.ch2Panner = this.audioCtx.createStereoPanner();
    this.ch3Panner = this.audioCtx.createStereoPanner();
    this.ch4Panner = this.audioCtx.createStereoPanner();

    this.ch1Panner.connect(this.masterGainL);
    this.ch2Panner.connect(this.masterGainL);
    this.ch3Panner.connect(this.masterGainL);
    this.ch4Panner.connect(this.masterGainL);

    // Pre-generate Wave RAM buffer (32 samples) and Noise buffers
    this.waveBuffer = this.audioCtx.createBuffer(1, 32, 65536);
    this.noise7BitBuffer = this.generateNoiseBuffer(7);
    this.noise15BitBuffer = this.generateNoiseBuffer(15);
  }

  public resumeContext(): void {
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Writes a byte to hardware register address (0xFF10 to 0xFF3F)
   */
  public writeRegister(address: number, val: number): void {
    const offset = address - 0xff10;
    if (offset < 0 || offset >= 0x30) return;

    this.registers[offset] = val;

    // Route write to specific channel handling
    if (address >= 0xff30 && address <= 0xff3f) {
      this.updateWaveRamByte(address - 0xff30, val);
      return;
    }

    switch (address) {
      // --- CH1 ---
      case 0xff10:
        break; // NR10 Sweep
      case 0xff11:
        this.updatePulseDuty(1, val);
        break; // NR11 Duty
      case 0xff12:
        break; // NR12 Envelope
      case 0xff13:
        this.ch1FreqLo = val;
        break; // NR13 Freq Lo
      case 0xff14: // NR14 Freq Hi + Trigger
        if (val & 0x80) this.triggerCh1(val);
        break;

      // --- CH2 ---
      case 0xff16:
        this.updatePulseDuty(2, val);
        break; // NR21 Duty
      case 0xff17:
        break; // NR22 Envelope
      case 0xff18:
        this.ch2FreqLo = val;
        break; // NR23 Freq Lo
      case 0xff19: // NR24 Freq Hi + Trigger
        if (val & 0x80) this.triggerCh2(val);
        break;

      // --- CH3 ---
      case 0xff1a:
        break; // NR30 Wave On/Off
      case 0xff1c:
        this.updateCh3Volume(val);
        break; // NR32 Volume Shift
      case 0xff1d:
        this.ch3FreqLo = val;
        break; // NR33 Freq Lo
      case 0xff1e: // NR34 Freq Hi + Trigger
        if (val & 0x80) this.triggerCh3(val);
        break;

      // --- CH4 ---
      case 0xff21:
        break; // NR42 Envelope
      case 0xff22:
        break; // NR43 Noise Clock/LFSR
      case 0xff23: // NR44 Trigger
        if (val & 0x80) this.triggerCh4(val);
        break;

      // --- Master Controls ---
      case 0xff24: // NR50 Master Volume
        const volL = ((val >> 4) & 0x07) / 7.0;
        const volR = (val & 0x07) / 7.0;
        this.masterGainL.gain.setValueAtTime(volL * 0.2, this.audioCtx.currentTime);
        this.masterGainR.gain.setValueAtTime(volR * 0.2, this.audioCtx.currentTime);
        break;

      case 0xff25: // NR51 Sound Panning Terminal
        this.ch1Panner.pan.setValueAtTime(
          val & 0x11 ? 0 : val & 0x10 ? -1 : 1,
          this.audioCtx.currentTime
        );
        this.ch2Panner.pan.setValueAtTime(
          val & 0x22 ? 0 : val & 0x20 ? -1 : 1,
          this.audioCtx.currentTime
        );
        this.ch3Panner.pan.setValueAtTime(
          val & 0x44 ? 0 : val & 0x40 ? -1 : 1,
          this.audioCtx.currentTime
        );
        this.ch4Panner.pan.setValueAtTime(
          val & 0x88 ? 0 : val & 0x80 ? -1 : 1,
          this.audioCtx.currentTime
        );
        break;

      case 0xff26: // NR52 Master On/Off
        if ((val & 0x80) === 0) this.reset();
        break;
    }
  }

  // --- Channel 1 Trigger & Envelope ---
  private triggerCh1(nr14: number): void {
    this.stopCh1();

    const rawFreq = ((nr14 & 0x07) << 8) | this.ch1FreqLo;
    const freqHz = 131072 / (2048 - rawFreq);
    if (!isFinite(freqHz) || freqHz <= 0) return;

    this.ch1Osc = this.audioCtx.createOscillator();
    this.ch1Gain = this.audioCtx.createGain();

    const nr11 = this.registers[0x01];
    this.ch1Osc.setPeriodicWave(this.createPulseWave((nr11 >> 6) & 0x03));
    this.ch1Osc.frequency.setValueAtTime(freqHz, this.audioCtx.currentTime);

    // Envelope
    const nr12 = this.registers[0x02];
    this.ch1Vol = (nr12 >> 4) & 0x0f;
    this.ch1Gain.gain.setValueAtTime(this.ch1Vol / 15.0, this.audioCtx.currentTime);

    this.ch1Osc.connect(this.ch1Gain);
    this.ch1Gain.connect(this.ch1Panner);
    this.ch1Osc.start();

    this.startEnvelopeTimer(1, nr12);
    this.startSweepTimer(rawFreq);
  }

  // --- Channel 2 Trigger ---
  private triggerCh2(nr24: number): void {
    this.stopCh2();

    const rawFreq = ((nr24 & 0x07) << 8) | this.ch2FreqLo;
    const freqHz = 131072 / (2048 - rawFreq);
    if (!isFinite(freqHz) || freqHz <= 0) return;

    this.ch2Osc = this.audioCtx.createOscillator();
    this.ch2Gain = this.audioCtx.createGain();

    const nr21 = this.registers[0x06];
    this.ch2Osc.setPeriodicWave(this.createPulseWave((nr21 >> 6) & 0x03));
    this.ch2Osc.frequency.setValueAtTime(freqHz, this.audioCtx.currentTime);

    const nr22 = this.registers[0x07];
    this.ch2Vol = (nr22 >> 4) & 0x0f;
    this.ch2Gain.gain.setValueAtTime(this.ch2Vol / 15.0, this.audioCtx.currentTime);

    this.ch2Osc.connect(this.ch2Gain);
    this.ch2Gain.connect(this.ch2Panner);
    this.ch2Osc.start();

    this.startEnvelopeTimer(2, nr22);
  }

  // --- Channel 3 Wave RAM Trigger ---
  private triggerCh3(nr34: number): void {
    this.stopCh3();
    if ((this.registers[0x0a] & 0x80) === 0) return; // NR30 Sound On check

    const rawFreq = ((nr34 & 0x07) << 8) | this.ch3FreqLo;
    const freqHz = 65536 / (2048 - rawFreq);
    if (!isFinite(freqHz) || freqHz <= 0) return;

    this.ch3Src = this.audioCtx.createBufferSource();
    this.ch3Gain = this.audioCtx.createGain();

    this.ch3Src.buffer = this.waveBuffer;
    this.ch3Src.loop = true;
    this.ch3Src.playbackRate.setValueAtTime(freqHz / (65536 / 32), this.audioCtx.currentTime);

    this.updateCh3Volume(this.registers[0x0c]);

    this.ch3Src.connect(this.ch3Gain);
    this.ch3Gain.connect(this.ch3Panner);
    this.ch3Src.start();
  }

  // --- Channel 4 Noise Trigger ---
  private triggerCh4(_ /* nr44 */: number): void {
    this.stopCh4();

    const nr43 = this.registers[0x12];
    const shift = (nr43 >> 4) & 0x0f;
    const is7Bit = (nr43 & 0x08) !== 0;
    const divCode = nr43 & 0x07;
    const divisor = divCode === 0 ? 0.5 : divCode;

    const freqHz = 524288 / divisor / Math.pow(2, shift + 1);
    if (!isFinite(freqHz) || freqHz <= 0) return;

    this.ch4Src = this.audioCtx.createBufferSource();
    this.ch4Gain = this.audioCtx.createGain();

    this.ch4Src.buffer = is7Bit ? this.noise7BitBuffer : this.noise15BitBuffer;
    this.ch4Src.loop = true;
    this.ch4Src.playbackRate.setValueAtTime(freqHz / 44100, this.audioCtx.currentTime);

    const nr42 = this.registers[0x11];
    this.ch4Vol = (nr42 >> 4) & 0x0f;
    this.ch4Gain.gain.setValueAtTime(this.ch4Vol / 15.0, this.audioCtx.currentTime);

    this.ch4Src.connect(this.ch4Gain);
    this.ch4Gain.connect(this.ch4Panner);
    this.ch4Src.start();

    this.startEnvelopeTimer(4, nr42);
  }

  // --- Helpers ---
  private updatePulseDuty(ch: 1 | 2, nr11: number): void {
    const dutyCode = (nr11 >> 6) & 0x03;
    const wave = this.createPulseWave(dutyCode);
    if (ch === 1 && this.ch1Osc) this.ch1Osc.setPeriodicWave(wave);
    if (ch === 2 && this.ch2Osc) this.ch2Osc.setPeriodicWave(wave);
  }

  private createPulseWave(dutyCode: number): PeriodicWave {
    const duties = [0.125, 0.25, 0.5, 0.75];
    const d = duties[dutyCode] || 0.5;
    const real = new Float32Array(32);
    const imag = new Float32Array(32);

    for (let n = 1; n < 32; n++) {
      real[n] = (2 / (n * Math.PI)) * Math.sin(2 * Math.PI * n * d);
    }
    return this.audioCtx.createPeriodicWave(real, imag);
  }

  private updateWaveRamByte(byteIdx: number, val: number): void {
    const data = this.waveBuffer.getChannelData(0);
    const high = ((val >> 4) & 0x0f) / 7.5 - 1.0;
    const low = (val & 0x0f) / 7.5 - 1.0;
    data[byteIdx * 2] = high;
    data[byteIdx * 2 + 1] = low;
  }

  private updateCh3Volume(nr32: number): void {
    if (!this.ch3Gain) return;
    const shift = (nr32 >> 5) & 0x03;
    const mults = [0, 1.0, 0.5, 0.25];
    this.ch3Gain.gain.setValueAtTime((mults[shift] ?? 0) * 0.3, this.audioCtx.currentTime);
  }

  private startEnvelopeTimer(ch: 1 | 2 | 4, nrX2: number): void {
    const stepLength = nrX2 & 0x07;
    if (stepLength === 0) return;

    const isUp = (nrX2 & 0x08) !== 0;
    const intervalMs = (stepLength / 64) * 1000;

    const timer = window.setInterval(() => {
      if (ch === 1) {
        this.ch1Vol = isUp ? Math.min(15, this.ch1Vol + 1) : Math.max(0, this.ch1Vol - 1);
        if (this.ch1Gain)
          this.ch1Gain.gain.setValueAtTime(this.ch1Vol / 15.0, this.audioCtx.currentTime);
        if (this.ch1Vol === 0 || this.ch1Vol === 15) clearInterval(timer);
      } else if (ch === 2) {
        this.ch2Vol = isUp ? Math.min(15, this.ch2Vol + 1) : Math.max(0, this.ch2Vol - 1);
        if (this.ch2Gain)
          this.ch2Gain.gain.setValueAtTime(this.ch2Vol / 15.0, this.audioCtx.currentTime);
        if (this.ch2Vol === 0 || this.ch2Vol === 15) clearInterval(timer);
      } else if (ch === 4) {
        this.ch4Vol = isUp ? Math.min(15, this.ch4Vol + 1) : Math.max(0, this.ch4Vol - 1);
        if (this.ch4Gain)
          this.ch4Gain.gain.setValueAtTime(this.ch4Vol / 15.0, this.audioCtx.currentTime);
        if (this.ch4Vol === 0 || this.ch4Vol === 15) clearInterval(timer);
      }
    }, intervalMs);

    if (ch === 1) this.ch1EnvTimer = timer;
    if (ch === 2) this.ch2EnvTimer = timer;
    if (ch === 4) this.ch4EnvTimer = timer;
  }

  private startSweepTimer(initialRawFreq: number): void {
    const nr10 = this.registers[0x00];
    const sweepTime = (nr10 >> 4) & 0x07;
    const shift = nr10 & 0x07;
    if (sweepTime === 0 || shift === 0) return;

    const isDecrease = (nr10 & 0x08) !== 0;
    const intervalMs = (sweepTime / 128) * 1000;
    let currentRaw = initialRawFreq;

    this.ch1SweepTimer = window.setInterval(() => {
      const delta = currentRaw >> shift;
      currentRaw = isDecrease ? currentRaw - delta : currentRaw + delta;

      if (currentRaw > 2047 || currentRaw < 0) {
        this.stopCh1();
        if (this.ch1SweepTimer) clearInterval(this.ch1SweepTimer);
        return;
      }

      const freqHz = 131072 / (2048 - currentRaw);
      if (this.ch1Osc && isFinite(freqHz)) {
        this.ch1Osc.frequency.setValueAtTime(freqHz, this.audioCtx.currentTime);
      }
    }, intervalMs);
  }

  private generateNoiseBuffer(bits: 7 | 15): AudioBuffer {
    const size = bits === 7 ? 127 : 32767;
    const buf = this.audioCtx.createBuffer(1, size, 44100);
    const data = buf.getChannelData(0);

    let lfsr = 0x7fff;
    for (let i = 0; i < size; i++) {
      const bit = (lfsr ^ (lfsr >> 1)) & 0x01;
      lfsr = (lfsr >> 1) | (bit << 14);
      if (bits === 7) lfsr = (lfsr & ~0x40) | (bit << 6);
      data[i] = lfsr & 0x01 ? 1.0 : -1.0;
    }
    return buf;
  }

  private stopCh1(): void {
    if (this.ch1EnvTimer) clearInterval(this.ch1EnvTimer);
    if (this.ch1SweepTimer) clearInterval(this.ch1SweepTimer);
    if (this.ch1Osc) {
      try {
        this.ch1Osc.stop();
      } catch {}
      this.ch1Osc.disconnect();
      this.ch1Osc = null;
    }
  }

  private stopCh2(): void {
    if (this.ch2EnvTimer) clearInterval(this.ch2EnvTimer);
    if (this.ch2Osc) {
      try {
        this.ch2Osc.stop();
      } catch {}
      this.ch2Osc.disconnect();
      this.ch2Osc = null;
    }
  }

  private stopCh3(): void {
    if (this.ch3Src) {
      try {
        this.ch3Src.stop();
      } catch {}
      this.ch3Src.disconnect();
      this.ch3Src = null;
    }
  }

  private stopCh4(): void {
    if (this.ch4EnvTimer) clearInterval(this.ch4EnvTimer);
    if (this.ch4Src) {
      try {
        this.ch4Src.stop();
      } catch {}
      this.ch4Src.disconnect();
      this.ch4Src = null;
    }
  }

  public reset(): void {
    this.stopCh1();
    this.stopCh2();
    this.stopCh3();
    this.stopCh4();
  }
}
