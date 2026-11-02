import React, { useState } from 'react';
import type { SongNode } from '../types/gbsong';
import { parseCHeader } from '../loaders/c_import.ts';
import './ImportModal.css';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: (nodes: SongNode[], mainNodeId: number) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportSuccess }) => {
    const [importText, setImportText] = useState<string>('');
    const [importError, setImportError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleImport = (codeToParse: string) => {
        try {
            setImportError(null);
            const { nodes: parsedNodes, mainNodeId } = parseCHeader(codeToParse);
            onImportSuccess(parsedNodes, mainNodeId);
            setImportText('');
            onClose();
        } catch (err: any) {
            setImportError(err.message || 'Failed to parse C header file.');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) handleImport(content);
        };
        reader.readAsText(file);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal-title">Import C Header (.h)</h3>
                <p className="modal-description">
                    Upload a <code>.h</code> file or paste its content below. Supports compressed and uncompressed sound data formats.
                </p>

                <input
                    type="file"
                    accept=".h,.c,.txt"
                    onChange={handleFileUpload}
                    className="modal-file-input"
                />

                <textarea
                    rows={10}
                    placeholder="Paste C header content here..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="modal-textarea"
                />

                {importError && <div className="modal-error">{importError}</div>}

                <div className="modal-actions">
                    <button onClick={onClose} className="cmd-add-btn">Cancel</button>
                    <button onClick={() => handleImport(importText)} className="primary-btn">Parse & Load</button>
                </div>
            </div>
        </div>
    );
};

export default ImportModal;
