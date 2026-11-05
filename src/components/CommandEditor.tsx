import React from 'react';
import {
  type Command,
  type DelayCommand,
  type RegisterCommand,
  type CallNodeCommand,
  type WaveRamCommand,
  getCommandValidationError,
  formatCommandHex,
} from '../types/command.ts';
import { GB_REGISTERS } from '../snd_regs';
import { getTypeColor } from '../helpers';
import { WaveRamVisualizer } from './WaveRamVisualizer';
import { ArrowUp, ArrowDown, Trash2, AlertCircle } from 'lucide-react';
import type { SongNode } from '../types/song_node.ts';

interface CommandEditorProps {
  selectedNode: SongNode;
  nodes: SongNode[];
  activeCommandIndex?: number | null;
  onUpdateNodeName: (name: string) => void;
  onAddCommand: (type: Command['type']) => void;
  onUpdateCommand: (commandId: string, updatedFields: Partial<Command>) => void;
  onDeleteCommand: (commandId: string) => void;
  onMoveCommand: (index: number, direction: -1 | 1) => void;
}

export const CommandEditor: React.FC<CommandEditorProps> = ({
  selectedNode,
  nodes,
  activeCommandIndex,
  onUpdateNodeName,
  onAddCommand,
  onUpdateCommand,
  onDeleteCommand,
  onMoveCommand,
}) => {
  const defaultDisplayName = selectedNode.id === 999 ? 'Main Track' : `Node #${selectedNode.id}`;

  return (
    <div className="main-content">
      <div className="main-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#89b4fa', fontWeight: 'bold', fontSize: '13px' }}>
            #{selectedNode.id}
          </span>
          <input
            type="text"
            value={selectedNode.name ?? ''}
            placeholder={defaultDisplayName}
            onChange={(e) => onUpdateNodeName(e.target.value)}
            style={{
              backgroundColor: '#11111b',
              border: '1px solid #45475a',
              color: '#cdd6f4',
              padding: '6px 10px',
              borderRadius: '4px',
              fontSize: '15px',
              fontWeight: 'bold',
              minWidth: '220px',
            }}
          />
        </div>

        <div className="add-cmd-group">
          <button onClick={() => onAddCommand('DELAY')} className="cmd-add-btn">
            + Delay
          </button>
          <button onClick={() => onAddCommand('REGISTER_WRITE')} className="cmd-add-btn">
            + Reg Write
          </button>
          <button onClick={() => onAddCommand('CALL_NODE8')} className="cmd-add-btn">
            + Call Node8
          </button>
          <button onClick={() => onAddCommand('CALL_NODE16')} className="cmd-add-btn">
            + Call Node16
          </button>
          <button onClick={() => onAddCommand('RET')} className="cmd-add-btn">
            + Return (0xFC)
          </button>
          <button onClick={() => onAddCommand('END')} className="cmd-add-btn">
            + End (0xFF)
          </button>
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
              const isPlayingRow = activeCommandIndex === idx;

              return (
                <React.Fragment key={cmd.id}>
                  <tr
                    className={`${validationErr ? 'has-error' : ''} ${isPlayingRow ? 'playing-row' : ''}`}
                    style={
                      isPlayingRow
                        ? {
                            backgroundColor: 'rgba(166, 227, 161, 0.18)',
                            outline: '1px solid #a6e3a1',
                          }
                        : undefined
                    }
                  >
                    <td>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>
                          {isPlayingRow ? '▶ ' : ''}
                          {idx + 1}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <button
                            disabled={idx === 0}
                            onClick={() => onMoveCommand(idx, -1)}
                            className="btn-micro"
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            disabled={idx === selectedNode.commands.length - 1}
                            onClick={() => onMoveCommand(idx, 1)}
                            className="btn-micro"
                          >
                            <ArrowDown size={10} />
                          </button>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className="type-tag"
                        style={{ backgroundColor: getTypeColor(cmd.type) }}
                      >
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
                            onChange={(e) =>
                              onUpdateCommand(cmd.id, {
                                delay: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            className="input-number"
                          />
                          <span className="hint">(0 - 127 vblanks)</span>
                        </div>
                      )}

                      {cmd.type === 'REGISTER_WRITE' && (
                        <div className="param-row">
                          <label className="label">Register:</label>
                          <select
                            value={(cmd as RegisterCommand).registerOffset}
                            onChange={(e) =>
                              onUpdateCommand(cmd.id, { registerOffset: parseInt(e.target.value) })
                            }
                            className="input-select"
                          >
                            {Object.entries(GB_REGISTERS).map(([offsetStr, name]) => (
                              <option key={offsetStr} value={parseInt(offsetStr)}>
                                {name.toString()}
                              </option>
                            ))}
                          </select>

                          <label className="label">Value:</label>
                          <input
                            type="text"
                            value={`0x${(cmd as RegisterCommand).value.toString(16).padStart(2, '0').toUpperCase()}`}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value.replace(/^0x/i, ''), 16);
                              onUpdateCommand(cmd.id, {
                                value: isNaN(parsed) ? 0 : Math.min(255, Math.max(0, parsed)),
                              });
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
                            onChange={(e) =>
                              onUpdateCommand(cmd.id, { targetNodeId: parseInt(e.target.value) })
                            }
                            className="input-select"
                          >
                            {nodes.map((n) => {
                              const label =
                                n.name && n.name.trim() !== ''
                                  ? n.name
                                  : n.id === 999
                                    ? 'Main Track (999)'
                                    : `Node #${n.id}`;
                              return (
                                <option key={n.id} value={n.id}>
                                  {label} {n.id === selectedNode.id ? '(Self)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {/* Standalone Wave RAM Visualizer */}
                      {cmd.type === 'WAVE_RAM' && (
                        <WaveRamVisualizer
                          payload={(cmd as WaveRamCommand).samples || new Array(16).fill(0)}
                          onChange={(newPayload) =>
                            onUpdateCommand(cmd.id, { samples: newPayload })
                          }
                        />
                      )}

                      {cmd.type === 'RET' && (
                        <span className="hint">Returns from subroutine (0xFC)</span>
                      )}
                      {cmd.type === 'END' && (
                        <span className="hint">Terminates playback (0xFF)</span>
                      )}
                    </td>

                    <td>
                      <code className="code-hex">{formatCommandHex(cmd)}</code>
                    </td>

                    <td>
                      <button onClick={() => onDeleteCommand(cmd.id)} className="btn-danger">
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
  );
};
