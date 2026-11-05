import { useState, useEffect, useRef, useCallback } from 'react';
import type { Command, WaveRamCommand } from '../types/command.ts';
import { GameBoyAPU } from '../audio/gb_apu.ts';
import type { SongNode } from '../types/song_node.ts';

export function useApuPlayer() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [activePc, setActivePc] = useState<number | null>(null);

  const apuRef = useRef<GameBoyAPU | null>(null);
  const timerRef = useRef<number | null>(null);

  const currentNodesRef = useRef<SongNode[]>([]);
  const currentNodeIdRef = useRef<number>(0);
  const pcRef = useRef<number>(0);
  const returnStackRef = useRef<Array<{ nodeId: number; pc: number }>>([]);
  const delayCounterRef = useRef<number>(0);

  const lastReportedNodeIdRef = useRef<number | null>(null);
  const lastReportedPcRef = useRef<number | null>(null);

  if (!apuRef.current) {
    apuRef.current = new GameBoyAPU();
  }

  const syncState = useCallback(() => {
    if (
      currentNodeIdRef.current !== lastReportedNodeIdRef.current ||
      pcRef.current !== lastReportedPcRef.current
    ) {
      lastReportedNodeIdRef.current = currentNodeIdRef.current;
      lastReportedPcRef.current = pcRef.current;
      setActiveNodeId(currentNodeIdRef.current);
      setActivePc(pcRef.current);
    }
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    returnStackRef.current = [];
    delayCounterRef.current = 0;
    pcRef.current = 0;
    lastReportedNodeIdRef.current = null;
    lastReportedPcRef.current = null;

    if (apuRef.current) {
      apuRef.current.reset();
    }

    setIsPlaying(false);
    setActiveNodeId(null);
    setActivePc(null);
  }, []);

  const handleReturnOrEnd = useCallback(() => {
    if (returnStackRef.current.length > 0) {
      const frame = returnStackRef.current.pop()!;
      currentNodeIdRef.current = frame.nodeId;
      pcRef.current = frame.pc;
      syncState();
    } else {
      stop();
    }
  }, [stop, syncState]);

  const executeCommand = useCallback(
    (cmd: Command) => {
      const apu = apuRef.current;
      if (!apu) return;

      switch (cmd.type) {
        case 'DELAY':
          delayCounterRef.current = cmd.delay;
          pcRef.current++;
          break;

        case 'REGISTER_WRITE':
          apu.writeRegister(0xff10 + cmd.registerOffset, cmd.value);
          pcRef.current++;
          break;

        case 'WAVE_RAM':
          const waveCmd = cmd as WaveRamCommand;
          const payload = waveCmd.samples || new Array(16).fill(0);
          for (let i = 0; i < 16; i++) {
            apu.writeRegister(0xff30 + i, payload[i] ?? 0);
          }
          pcRef.current++;
          break;

        case 'CALL_NODE8':
        case 'CALL_NODE16':
          if (returnStackRef.current.length < 8) {
            returnStackRef.current.push({
              nodeId: currentNodeIdRef.current,
              pc: pcRef.current + 1,
            });
            currentNodeIdRef.current = cmd.targetNodeId;
            pcRef.current = 0;
            syncState();
          } else {
            pcRef.current++;
          }
          break;

        case 'RET':
          handleReturnOrEnd();
          break;

        case 'END':
          stop();
          break;

        default:
          pcRef.current++;
          break;
      }
    },
    [handleReturnOrEnd, stop, syncState]
  );

  const vblankTick = useCallback(() => {
    if (delayCounterRef.current > 0) {
      delayCounterRef.current--;
      return;
    }

    while (delayCounterRef.current === 0) {
      const node = currentNodesRef.current.find((n) => n.id === currentNodeIdRef.current);
      if (!node || pcRef.current >= node.commands.length) {
        handleReturnOrEnd();
        break;
      }

      syncState();
      const cmd = node.commands[pcRef.current];
      executeCommand(cmd);
    }
  }, [executeCommand, handleReturnOrEnd, syncState]);

  const play = useCallback(
    (nodes: SongNode[], startNodeId: number = 0) => {
      stop();

      if (apuRef.current) {
        apuRef.current.resumeContext();
        apuRef.current.writeRegister(0xff26, 0x80); // NR52 Sound On
        apuRef.current.writeRegister(0xff25, 0xff); // NR51 Stereo
        apuRef.current.writeRegister(0xff24, 0x77); // NR50 Master Vol
      }

      currentNodesRef.current = nodes;
      currentNodeIdRef.current = startNodeId;
      pcRef.current = 0;
      returnStackRef.current = [];
      delayCounterRef.current = 0;

      lastReportedNodeIdRef.current = startNodeId;
      lastReportedPcRef.current = 0;
      setActiveNodeId(startNodeId);
      setActivePc(0);
      setIsPlaying(true);

      timerRef.current = window.setInterval(vblankTick, 1000 / 60);
    },
    [stop, vblankTick]
  );

  const togglePlay = useCallback(
    (nodes: SongNode[], startNodeId: number = 0) => {
      if (isPlaying) {
        stop();
      } else {
        play(nodes, startNodeId);
      }
    },
    [isPlaying, play, stop]
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isPlaying,
    activeNodeId,
    activePc,
    play,
    stop,
    togglePlay,
  };
}
