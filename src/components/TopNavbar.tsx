import React, { useState } from 'react';
import type { SongNode } from '../types/gbsong';
import { player } from '../audio/basic';
import { Code, Play, Square, Upload } from 'lucide-react';
import './TopNavbar.css';

interface TopNavbarProps {
    nodes: SongNode[];
    selectedNodeId: number;
    onOpenImport: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ nodes, selectedNodeId, onOpenImport }) => {
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    const handleTogglePlay = () => {
        if (isPlaying) {
            player.stop();
            setIsPlaying(false);
        } else {
            player.start(nodes, selectedNodeId);
            setIsPlaying(true);
        }
    };

    return (
        <header className="top-navbar">
            <div className="navbar-brand">
                <Code size={20} color="#89b4fa" />
                <span className="navbar-title">GameBoy Bytecode Music Editor</span>
            </div>

            <div className="navbar-actions">
                <button
                    onClick={handleTogglePlay}
                    className="primary-btn"
                    style={{ backgroundColor: isPlaying ? '#f38ba8' : '#a6e3a1' }}
                >
                    {isPlaying ? <Square size={14} /> : <Play size={14} />}
                    {isPlaying ? 'Stop Playback' : 'Play Song'}
                </button>

                <button onClick={onOpenImport} className="primary-btn" title="Import C Header File">
                    <Upload size={14} /> Import .h
                </button>
            </div>
        </header>
    );
};
