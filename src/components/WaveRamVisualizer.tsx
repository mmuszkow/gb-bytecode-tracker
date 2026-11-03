import React, { useState } from 'react';
import { WaveRamEditModal } from './WaveRamEditModal';
import { Sliders } from 'lucide-react';

interface WaveRamVisualizerProps {
  payload: number[]; // 16 bytes
  onChange: (newPayload: number[]) => void;
}

export const WaveRamVisualizer: React.FC<WaveRamVisualizerProps> = ({ payload, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Unpack 16 bytes into 32 4-bit samples (0..15)
  const samples: number[] = [];
  for (let i = 0; i < 16; i++) {
    const b = payload[i] ?? 0;
    samples.push((b >> 4) & 0x0f);
    samples.push(b & 0x0f);
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* 32 Column Preview Bar Graph */}
        <div
          onClick={() => setIsModalOpen(true)}
          title="Click to edit 32-sample Wave RAM waveform"
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '2px',
            height: '42px',
            width: '224px',
            backgroundColor: '#11111b',
            padding: '4px 6px',
            borderRadius: '6px',
            border: '1px solid #313244',
            boxSizing: 'border-box',
            cursor: 'pointer',
          }}
        >
          {samples.map((val, idx) => {
            const heightPct = Math.max(8, (val / 15) * 100);
            const byteIdx = Math.floor(idx / 2);
            const byteAddr = (0x30 + byteIdx).toString(16).toUpperCase();
            const nibble = idx % 2 === 0 ? 'Upper' : 'Lower';

            return (
              <div
                key={idx}
                title={`Sample [${idx}] (0xFF${byteAddr} ${nibble}): 0x${val.toString(16).toUpperCase()} (${val})`}
                style={{
                  flex: 1,
                  height: `${heightPct}%`,
                  backgroundColor: '#fab387',
                  borderRadius: '1px 1px 0 0',
                  transition: 'height 0.1s ease',
                }}
              />
            );
          })}
        </div>

        {/* Edit Button */}
        <button
          className="cmd-add-btn"
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}
        >
          <Sliders size={12} /> Edit Wave
        </button>
      </div>

      {/* Wave RAM Edit Modal */}
      <WaveRamEditModal
        isOpen={isModalOpen}
        payload={payload}
        onSave={onChange}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
