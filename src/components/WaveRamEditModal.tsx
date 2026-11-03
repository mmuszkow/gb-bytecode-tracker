import React, { useState, useEffect } from 'react';
import { X, Sliders, Activity } from 'lucide-react';

interface WaveRamEditModalProps {
    isOpen: boolean;
    payload: number[]; // 16 bytes
    onSave: (newPayload: number[]) => void; // Expects 16 bytes
    onClose: () => void;
}

// Helper: Unpack 16 bytes into 32 4-bit samples (0..15)
function unpack4BitSamples(bytes: number[]): number[] {
    const samples: number[] = [];
    for (let i = 0; i < 16; i++) {
        const b = bytes[i] ?? 0;
        samples.push((b >> 4) & 0x0f); // Upper nibble (Sample 2i)
        samples.push(b & 0x0f);        // Lower nibble (Sample 2i+1)
    }
    return samples;
}

// Helper: Pack 32 4-bit samples into 16 bytes
function pack4BitSamples(samples: number[]): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < 16; i++) {
        const high = (samples[i * 2] ?? 0) & 0x0f;
        const low = (samples[i * 2 + 1] ?? 0) & 0x0f;
        bytes.push((high << 4) | low);
    }
    return bytes;
}

export const WaveRamEditModal: React.FC<WaveRamEditModalProps> = ({
                                                                      isOpen,
                                                                      payload,
                                                                      onSave,
                                                                      onClose,
                                                                  }) => {
    const [samples, setSamples] = useState<number[]>([]);

    useEffect(() => {
        setSamples(unpack4BitSamples(payload));
    }, [payload, isOpen]);

    if (!isOpen) return null;

    const handleSampleChange = (index: number, val: number) => {
        const clamped = Math.max(0, Math.min(15, val));
        const next = [...samples];
        next[index] = clamped;
        setSamples(next);
    };

    // --- 4-bit Waveform Presets (Values 0..15) ---
    const applyPreset = (type: 'sine' | 'triangle' | 'saw' | 'square' | 'silence') => {
        const next = new Array(32).fill(0);
        for (let i = 0; i < 32; i++) {
            if (type === 'sine') {
                next[i] = Math.round((Math.sin((i / 32) * 2 * Math.PI) + 1) * 7.5);
            } else if (type === 'triangle') {
                next[i] = i < 16 ? Math.round((i / 15) * 15) : Math.round(((31 - i) / 15) * 15);
            } else if (type === 'saw') {
                next[i] = Math.round((i / 31) * 15);
            } else if (type === 'square') {
                next[i] = i < 16 ? 15 : 0;
            } else if (type === 'silence') {
                next[i] = 0;
            }
        }
        setSamples(next);
    };

    const handleSave = () => {
        onSave(pack4BitSamples(samples));
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-card"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '880px',
                    maxWidth: '96vw',
                    backgroundColor: '#1e1e2e',
                    border: '1px solid #313244',
                    borderRadius: '10px',
                    padding: '20px',
                    color: '#cdd6f4',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={18} color="#fab387" />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                            Edit Wave RAM Waveform (32 × 4-bit Samples)
                        </h3>
                    </div>
                    <button onClick={onClose} className="btn-danger" style={{ padding: '4px' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Preset Generators */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', backgroundColor: '#11111b', padding: '8px 12px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#a6adc8', fontWeight: 'bold' }}>Presets:</span>
                    <button className="cmd-add-btn" onClick={() => applyPreset('sine')}>Sine</button>
                    <button className="cmd-add-btn" onClick={() => applyPreset('triangle')}>Triangle</button>
                    <button className="cmd-add-btn" onClick={() => applyPreset('saw')}>Sawtooth</button>
                    <button className="cmd-add-btn" onClick={() => applyPreset('square')}>Square</button>
                    <button className="cmd-add-btn" onClick={() => applyPreset('silence')}>Silence</button>
                </div>

                {/* 32 Vertical Sliders & 4-bit Hex Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(32, 1fr)', gap: '4px', marginBottom: '20px' }}>
                    {samples.map((val, idx) => {
                        const byteAddr = (0x30 + Math.floor(idx / 2)).toString(16).toUpperCase();
                        const nibbleLabel = idx % 2 === 0 ? 'H' : 'L';
                        const hexVal = val.toString(16).toUpperCase();

                        return (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    backgroundColor: '#11111b',
                                    padding: '6px 1px',
                                    borderRadius: '4px',
                                    border: '1px solid #313244',
                                }}
                            >
                <span style={{ fontSize: '9px', color: '#89b4fa', fontFamily: 'monospace' }}>
                  {byteAddr}{nibbleLabel}
                </span>

                                <div style={{ height: '100px', display: 'flex', alignItems: 'center', margin: '6px 0' }}>
                                    <input
                                        type="range"
                                        min={0}
                                        max={15}
                                        step={1}
                                        value={val}
                                        onChange={(e) => handleSampleChange(idx, parseInt(e.target.value) || 0)}
                                        style={{
                                            writingMode: 'vertical-lr',
                                            direction: 'rtl',
                                            width: '14px',
                                            height: '90px',
                                            accentColor: '#fab387',
                                            cursor: 'pointer',
                                        }}
                                    />
                                </div>

                                <input
                                    type="text"
                                    maxLength={1}
                                    value={hexVal}
                                    onChange={(e) => {
                                        const parsed = parseInt(e.target.value, 16);
                                        handleSampleChange(idx, isNaN(parsed) ? 0 : parsed);
                                    }}
                                    style={{
                                        width: '20px',
                                        textAlign: 'center',
                                        backgroundColor: '#313244',
                                        border: '1px solid #45475a',
                                        color: '#f9e2af',
                                        fontFamily: 'monospace',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        borderRadius: '3px',
                                        padding: '2px 0',
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="cmd-add-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="primary-btn" onClick={handleSave} style={{ backgroundColor: '#fab387', color: '#11111b' }}>
                        <Sliders size={14} /> Apply Waveform
                    </button>
                </div>
            </div>
        </div>
    );
};