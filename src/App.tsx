import React, { useState } from 'react';
import type {SongNode, Command, DelayCommand, RegisterCommand, CallNodeCommand} from './types/gbsong';
import { parseCHeader } from './loaders/c_header';
import { FolderPlus, Trash2, ArrowUp, ArrowDown, AlertCircle, Hash, Code, Upload } from 'lucide-react';
import './App.css';
import {formatCommandHex, GB_REGISTERS, getCommandValidationError} from "./snd_regs.ts";
import {getTypeColor} from "./helpers.ts";

const INITIAL_NODES: SongNode[] = [
  {
    id: 0,
    commands: [
      { id: 'c-1', type: 'REGISTER_WRITE', registerOffset: 0x02, value: 0xF3 },
      { id: 'c-2', type: 'REGISTER_WRITE', registerOffset: 0x03, value: 0x83 },
      { id: 'c-3', type: 'REGISTER_WRITE', registerOffset: 0x04, value: 0x87 },
      { id: 'c-4', type: 'DELAY', delay: 16 },
      { id: 'c-5', type: 'CALL_NODE8', targetNodeId: 1 },
      { id: 'c-6', type: 'END' }
    ]
  },
  {
    id: 1,
    commands: [
      { id: 'c-7', type: 'REGISTER_WRITE', registerOffset: 0x03, value: 0xC1 },
      { id: 'c-8', type: 'REGISTER_WRITE', registerOffset: 0x04, value: 0x87 },
      { id: 'c-9', type: 'DELAY', delay: 8 },
      { id: 'c-10', type: 'RET' }
    ]
  }
];

export default function App() {
  const [nodes, setNodes] = useState<SongNode[]>(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<number>(0);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[0];

  // --- Header File Import Handler ---
  const handleImport = (codeToParse: string) => {
    try {
      setImportError(null);
      const { nodes: parsedNodes, mainNodeId } = parseCHeader(codeToParse);
      setNodes(parsedNodes);
      setSelectedNodeId(mainNodeId);
      setShowImportModal(false);
      setImportText('');
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

  // --- Node Actions ---
  const addNode = () => {
    const nextId = nodes.length > 0 ? Math.max(...nodes.map(n => n.id)) + 1 : 0;
    const newNode: SongNode = {
      id: nextId,
      commands: [{ id: `cmd-${Date.now()}`, type: 'RET' }]
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(nextId);
  };

  const deleteNode = (id: number) => {
    if (nodes.length <= 1) return;
    const filtered = nodes.filter(n => n.id !== id);
    setNodes(filtered);
    if (selectedNodeId === id) setSelectedNodeId(filtered[0].id);
  };

  // --- Command Actions ---
  const addCommand = (nodeId: number, type: Command['type']) => {
    const id = `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let newCmd: Command;

    switch (type) {
      case 'DELAY':
        newCmd = { id, type: 'DELAY', delay: 10 };
        break;
      case 'REGISTER_WRITE':
        newCmd = { id, type: 'REGISTER_WRITE', registerOffset: 0x00, value: 0x00 };
        break;
      case 'CALL_NODE8':
      case 'CALL_NODE16':
        const otherNode = nodes.find(n => n.id !== nodeId);
        newCmd = { id, type, targetNodeId: otherNode ? otherNode.id : nodeId };
        break;
      case 'RET':
        newCmd = { id, type: 'RET' };
        break;
      case 'END':
        newCmd = { id, type: 'END' };
        break;
      default:
        return;
    }

    setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, commands: [...node.commands, newCmd] } : node));
  };

  const updateCommand = (nodeId: number, commandId: string, updatedFields: Partial<Command>) => {
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId) return node;
      return {
        ...node,
        commands: node.commands.map(cmd => cmd.id === commandId ? ({ ...cmd, ...updatedFields } as Command) : cmd)
      };
    }));
  };

  const deleteCommand = (nodeId: number, commandId: string) => {
    setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, commands: node.commands.filter(c => c.id !== commandId) } : node));
  };

  const moveCommand = (nodeId: number, index: number, direction: -1 | 1) => {
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId) return node;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= node.commands.length) return node;

      const newCommands = [...node.commands];
      const temp = newCommands[index];
      newCommands[index] = newCommands[targetIndex];
      newCommands[targetIndex] = temp;

      return { ...node, commands: newCommands };
    }));
  };

  return (
      <div className="app-container">
        {/* Sidebar Navigation */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h3><Code size={18} color="#89b4fa" /> GB Song Nodes</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setShowImportModal(true)} className="primary-btn" title="Import C Header File">
                <Upload size={14} /> Import .h
              </button>
              <button onClick={addNode} className="primary-btn">
                <FolderPlus size={14} /> Add
              </button>
            </div>
          </div>

          <div className="node-list">
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                  <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`node-item ${isSelected ? 'selected' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Hash size={14} color="#f9e2af" />
                      <span>{node.id === 999 ? 'Main Track (999)' : `Node #${node.id}`}</span>
                      <span className="badge">{node.commands.length} cmds</span>
                    </div>
                    {nodes.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                            className="btn-danger"
                            title="Delete Node"
                        >
                          <Trash2 size={13} />
                        </button>
                    )}
                  </div>
              );
            })}
          </div>
        </div>

        {/* Main Command Editor */}
        <div className="main-content">
          {selectedNode ? (
              <div>
                <div className="main-header">
                  <h2>Editing {selectedNode.id === 999 ? 'Main Track (Node #999)' : `Node #${selectedNode.id}`}</h2>
                  <div className="add-cmd-group">
                    <button onClick={() => addCommand(selectedNode.id, 'DELAY')} className="cmd-add-btn">+ Delay</button>
                    <button onClick={() => addCommand(selectedNode.id, 'REGISTER_WRITE')} className="cmd-add-btn">+ Reg Write</button>
                    <button onClick={() => addCommand(selectedNode.id, 'CALL_NODE8')} className="cmd-add-btn">+ Call Node8</button>
                    <button onClick={() => addCommand(selectedNode.id, 'CALL_NODE16')} className="cmd-add-btn">+ Call Node16</button>
                    <button onClick={() => addCommand(selectedNode.id, 'RET')} className="cmd-add-btn">+ Return (0xFC)</button>
                    <button onClick={() => addCommand(selectedNode.id, 'END')} className="cmd-add-btn">+ End (0xFF)</button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="cmd-table">
                    <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Order</th>
                      <th style={{ width: '160px' }}>Command Type</th>
                      <th>Parameters & Inputs</th>
                      <th style={{ width: '140px' }}>Hex Bytes</th>
                      <th style={{ width: '60px' }}>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {selectedNode.commands.map((cmd, idx) => {
                      const validationErr = getCommandValidationError(cmd, nodes);
                      return (
                          <React.Fragment key={cmd.id}>
                            <tr className={validationErr ? 'has-error' : ''}>
                              <td>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 'bold' }}>{idx + 1}</span>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <button
                                        disabled={idx === 0}
                                        onClick={() => moveCommand(selectedNode.id, idx, -1)}
                                        className="btn-micro"
                                    >
                                      <ArrowUp size={10} />
                                    </button>
                                    <button
                                        disabled={idx === selectedNode.commands.length - 1}
                                        onClick={() => moveCommand(selectedNode.id, idx, 1)}
                                        className="btn-micro"
                                    >
                                      <ArrowDown size={10} />
                                    </button>
                                  </div>
                                </div>
                              </td>

                              <td>
                            <span className="type-tag" style={{ backgroundColor: getTypeColor(cmd.type) }}>
                              {cmd.type}
                            </span>
                              </td>

                              <td>
                                {cmd.type === 'DELAY' && (
                                    <div className="param-row">
                                      <label className="label">Delay (vblanks):</label>
                                      <input
                                          type="number"
                                          min={0}
                                          max={127}
                                          value={(cmd as DelayCommand).delay}
                                          onChange={(e) => updateCommand(selectedNode.id, cmd.id, { delay: Math.max(0, parseInt(e.target.value) || 0) })}
                                          className="input-number"
                                      />
                                      <span className="hint">(0 - 127 vblanks)</span>
                                    </div>
                                )}

                                {cmd.type === 'REGISTER_WRITE' && (
                                    <div className="param-row">
                                      <label className="label">Target Register:</label>
                                      <select
                                          value={(cmd as RegisterCommand).registerOffset}
                                          onChange={(e) => updateCommand(selectedNode.id, cmd.id, { registerOffset: parseInt(e.target.value) })}
                                          className="input-select"
                                      >
                                        {Object.entries(GB_REGISTERS).map(([offsetStr, name]) => (
                                            <option key={offsetStr} value={parseInt(offsetStr)}>{name.toString()}</option>
                                        ))}
                                      </select>

                                      <label className="label">Value (Hex):</label>
                                      <input
                                          type="text"
                                          value={`0x${(cmd as RegisterCommand).value.toString(16).padStart(2, '0').toUpperCase()}`}
                                          onChange={(e) => {
                                            const parsed = parseInt(e.target.value.replace(/^0x/i, ''), 16);
                                            updateCommand(selectedNode.id, cmd.id, { value: isNaN(parsed) ? 0 : Math.min(255, Math.max(0, parsed)) });
                                          }}
                                          className="input-hex"
                                      />
                                    </div>
                                )}

                                {(cmd.type === 'CALL_NODE8' || cmd.type === 'CALL_NODE16') && (
                                    <div className="param-row">
                                      <label className="label">Target Node ID:</label>
                                      <select
                                          value={(cmd as CallNodeCommand).targetNodeId}
                                          onChange={(e) => updateCommand(selectedNode.id, cmd.id, { targetNodeId: parseInt(e.target.value) })}
                                          className="input-select"
                                      >
                                        {nodes.map(n => (
                                            <option key={n.id} value={n.id}>
                                              {n.id === 999 ? 'Main Track (999)' : `Node #${n.id}`} {n.id === selectedNode.id ? '(Self)' : ''}
                                            </option>
                                        ))}
                                      </select>
                                    </div>
                                )}

                                {cmd.type === 'RET' && <span className="hint">Returns from subroutine (0xFC)</span>}
                                {cmd.type === 'END' && <span className="hint">Terminates playback (0xFF)</span>}
                              </td>

                              <td>
                                <code className="code-hex">{formatCommandHex(cmd)}</code>
                              </td>

                              <td>
                                <button onClick={() => deleteCommand(selectedNode.id, cmd.id)} className="btn-danger">
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>

                            {validationErr && (
                                <tr className="error-row">
                                  <td colSpan={5}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <AlertCircle size={14} />
                                      <span>{validationErr}</span>
                                    </div>
                                  </td>
                                </tr>
                            )}
                          </React.Fragment>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              </div>
          ) : (
              <div>Select or create a node to edit.</div>
          )}
        </div>

        {/* Import Modal */}
        {showImportModal && (
            <div style={modalStyles.overlay}>
              <div style={modalStyles.modal}>
                <h3 style={{ marginTop: 0 }}>Import C Header (.h)</h3>
                <p style={{ fontSize: '13px', color: '#a6adc8' }}>
                  Upload a <code>.h</code> file or paste its content below. Supports compressed (with pointer table) and uncompressed formats.
                </p>

                <input type="file" accept=".h,.c,.txt" onChange={handleFileUpload} style={{ marginBottom: '12px' }} />

                <textarea
                    rows={10}
                    placeholder="Paste C header content here..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    style={modalStyles.textarea}
                />

                {importError && <div style={{ color: '#f38ba8', fontSize: '12px', marginTop: '8px' }}>{importError}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                  <button onClick={() => setShowImportModal(false)} className="cmd-add-btn">Cancel</button>
                  <button onClick={() => handleImport(importText)} className="primary-btn">Parse & Load</button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#1e1e2e',
    padding: '24px',
    borderRadius: '8px',
    width: '600px',
    maxWidth: '90%',
    border: '1px solid #313244'
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#11111b',
    color: '#cdd6f4',
    border: '1px solid #45475a',
    borderRadius: '4px',
    padding: '8px',
    fontFamily: 'monospace',
    fontSize: '12px'
  }
};