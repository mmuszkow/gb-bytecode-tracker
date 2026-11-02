import React, { useState } from 'react';
import { WaveRamEditModal } from './WaveRamEditModal';
import { Sliders } from 'lucide-react';

interface WaveRamVisualizerProps {
    payload: number[];
    onChange: (newPayload: number[]) => void;
}

export const WaveRamVisualizer: React.FC<WaveRamVisualizerProps> = ({
                                                                        payload,
                                                                        onChange,
                                                                    }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const bytes = Array.from({ length: 16 }, (_, i) => payload[i] ?? 0);

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Interactive Bar Chart Preview */}
                <div
                    onClick={() => setIsModalOpen(true)}
                    title="Click to edit Wave RAM waveform"
                    style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '3px',
                        height: '42px',
                        width: '192px',
                        backgroundColor: '#11111b',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: '1px solid #313244',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                    }}
                >
                    {bytes.map((val, idx) => {
                        const heightPct = Math.max(6, (val / 255) * 100);
                        const hexVal = `0x${val.toString(16).padStart(2, '0').toUpperCase()}`;

                        return (
                            <div
                                key={idx}
                                title={`Sample [${idx}] (0xFF${(0x30 + idx).toString(16).toUpperCase()}): ${hexVal} (${val})`}
                                style={{
                                    flex: 1,
                                    height: `${heightPct}%`,
                                    backgroundColor: '#fab387',
                                    borderRadius: '2px 2px 0 0',
                                    transition: 'height 0.15s ease',
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

            {/* Modal Dialog */}
            <WaveRamEditModal
                isOpen={isModalOpen}
                payload={payload}
                onSave={onChange}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};