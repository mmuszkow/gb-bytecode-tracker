import React from 'react';
import { Code, Play, Square, Upload, Download } from 'lucide-react';
import './TopNavbar.css';
import { useApuPlayer } from '../hooks/useApuPlayer.ts';
import type { SongNode } from '../types/song_node.ts';

interface TopNavbarProps {
  nodes: SongNode[];
  selectedNodeId: number;
  onOpenImport: () => void;
  onOpenExport: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  nodes,
  selectedNodeId,
  onOpenImport,
  onOpenExport,
}) => {
  const { isPlaying, togglePlay } = useApuPlayer();

  return (
    <header className="top-navbar">
      <div className="navbar-brand">
        <Code size={20} color="#89b4fa" />
        <span className="navbar-title">GameBoy Bytecode Music Editor</span>
      </div>

      <div className="navbar-actions">
        <button
          onClick={() => togglePlay(nodes, selectedNodeId)}
          className="primary-btn"
          style={{ backgroundColor: isPlaying ? '#f38ba8' : '#a6e3a1' }}
        >
          {isPlaying ? <Square size={14} /> : <Play size={14} />}
          {isPlaying ? 'Stop Playback' : 'Play Song'}
        </button>

        <button onClick={onOpenImport} className="primary-btn" title="Import C Header File">
          <Upload size={14} /> Import .h
        </button>

        <button
          onClick={onOpenExport}
          className="primary-btn"
          style={{ backgroundColor: '#cba6f7', color: '#11111b' }}
          title="Save / Export C Header"
        >
          <Download size={14} /> Export .h
        </button>
      </div>
    </header>
  );
};
