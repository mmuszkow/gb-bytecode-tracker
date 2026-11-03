import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Command } from '../../types/command.ts';
import { GB_REGISTERS } from '../../snd_regs';
import { getTypeColor } from '../../helpers';
import { Hash, ArrowRight } from 'lucide-react';
import type { SongNode } from '../../types/song_node.ts';

interface CustomSongNodeData {
  node: SongNode;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

export const CustomSongNode: React.FC<{ data: CustomSongNodeData }> = ({ data }) => {
  const { node, isSelected, onSelect } = data;
  const displayName =
    node.name && node.name.trim() !== ''
      ? node.name
      : node.id === 999
        ? 'Main Track'
        : `Node #${node.id}`;

  return (
    <div
      onClick={() => onSelect(node.id)}
      style={{
        backgroundColor: isSelected ? '#161622' : '#1e1e2e',
        border: `2px solid ${isSelected ? '#89b4fa' : '#313244'}`,
        borderRadius: '8px',
        padding: '10px',
        minWidth: '180px',
        maxWidth: '260px',
        color: '#cdd6f4',
        boxShadow: isSelected ? '0 0 12px rgba(137, 180, 250, 0.3)' : '0 4px 10px rgba(0,0,0,0.3)',
        cursor: 'pointer',
      }}
    >
      {/* Input Handle (Target for incoming subroutine calls) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#89b4fa', width: 8, height: 8 }}
      />

      {/* Card Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '8px',
          paddingBottom: '4px',
          borderBottom: '1px solid #313244',
        }}
      >
        <Hash size={13} color="#f9e2af" />
        <span style={{ color: '#89b4fa', fontWeight: 'bold', fontSize: '12px' }}>#{node.id}</span>
        <span
          style={{
            fontWeight: 600,
            fontSize: '12px',
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </span>
      </div>

      {/* Command Mini Tiles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {node.commands.map((cmd) => (
          <GraphCommandTile key={cmd.id} cmd={cmd} />
        ))}
      </div>

      {/* Output Handle (Source for outgoing subroutine calls) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#f9e2af', width: 8, height: 8 }}
      />
    </div>
  );
};

const GraphCommandTile: React.FC<{ cmd: Command }> = ({ cmd }) => {
  const bg = getTypeColor(cmd.type);

  switch (cmd.type) {
    case 'DELAY':
      return (
        <span style={{ ...tileStyle, borderLeftColor: bg }} title={`Delay ${cmd.delay} vblanks`}>
          <span style={{ opacity: 0.7 }}>D</span>
          <span>{cmd.delay}v</span>
        </span>
      );

    case 'REGISTER_WRITE':
      const regName = GB_REGISTERS[cmd.registerOffset] || `0x${cmd.registerOffset.toString(16)}`;
      const shortReg = regName.split(' ')[0];
      const hexVal = `0x${cmd.value.toString(16).padStart(2, '0').toUpperCase()}`;
      return (
        <span style={{ ...tileStyle, borderLeftColor: bg }} title={`${regName} = ${hexVal}`}>
          <span style={{ opacity: 0.7 }}>W</span>
          <span>
            {shortReg}={hexVal}
          </span>
        </span>
      );

    case 'CALL_NODE8':
    case 'CALL_NODE16':
      return (
        <span
          style={{
            ...tileStyle,
            borderLeftColor: bg,
            backgroundColor: 'rgba(249, 226, 175, 0.15)',
            color: '#f9e2af',
          }}
          title={`Call Node #${cmd.targetNodeId}`}
        >
          <ArrowRight size={10} color="#f9e2af" />
          <span>#{cmd.targetNodeId}</span>
        </span>
      );

    case 'RET':
      return <span style={{ ...tileStyle, borderLeftColor: bg }}>RET</span>;

    case 'END':
      return <span style={{ ...tileStyle, borderLeftColor: bg }}>END</span>;

    default:
      return null;
  }
};

const tileStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3px',
  backgroundColor: '#313244',
  borderLeft: '3px solid #a6adc8',
  borderRadius: '3px',
  padding: '2px 5px',
  fontSize: '10px',
  fontFamily: 'monospace',
  color: '#cdd6f4',
};
