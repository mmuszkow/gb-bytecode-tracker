import React, { useState } from 'react';
import { exportCHeader } from '../loaders/c_export';
import { Download, Copy, Check } from 'lucide-react';
import './ExportModal.css';
import type { SongNode } from '../types/song_node.ts';

interface ExportModalProps {
  isOpen: boolean;
  nodes: SongNode[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, nodes, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);
  if (!isOpen) return null;

  const headerCode = exportCHeader(nodes, 'SND_SONG0');

  const handleCopy = () => {
    navigator.clipboard.writeText(headerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([headerCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'song0.h';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Export C Header (.h)</h3>
        <p className="modal-description">
          Generated C header format containing byte data and node pointers with custom names in
          comments.
        </p>

        <textarea rows={14} readOnly value={headerCode} className="modal-textarea" />

        <div className="modal-actions">
          <button
            onClick={handleCopy}
            className="cmd-add-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {copied ? <Check size={14} color="#a6e3a1" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} className="cmd-add-btn">
              Close
            </button>
            <button onClick={handleDownload} className="primary-btn">
              <Download size={14} /> Download song0.h
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
