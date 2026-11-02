import { useState, useEffect } from 'react';
import { X, Sliders, Activity } from 'lucide-react';

interface WaveRamEditModalProps {
    isOpen: boolean;
    payload: number[];
    onSave: (newPayload: number[]) => void;
    onClose: () => void;
}

export const WaveRamEditModal: React.FC<WaveRamEditModalProps> = ({
                                                                      isOpen,
                                                                      payload,
                                                                      onSave,
                                                                      onClose,
                                                                  }) => {
    const [samples, setSamples] = useState<number[]>([]);

    useEffect(() => {
        // Standardize to 16 bytes
        const current = Array.from({ length: 16 }, (_, i) => payload[i] ?? 0);
        setSamples(current);
    }, [payload, isOpen]);

    if (!isOpen) return null;

    const handleSampleChange = (index: number, val: number) => {
        const clamped = Math.max(0, Math.min(255, val));
        const next = [...samples];
        next[index] = clamped;
        setSamples(next);
    };

    // --- Waveform Generator Presets ---
    const applyPreset = (type: 'sine' | 'triangle' | 'saw' | 'square' | 'silence') => {
        const next = new Array(16).fill(0);
        for (let i = 0; i < 16; i++) {
            if (type === 'sine') {
                next[i] = Math.round((Math.sin((i / 16) * 2 * Math.PI) + 1) * 127.5);
            } else if (type === 'triangle') {
                next[i] = i < 8 ? Math.round((i / 7) * 255) : Math.round(((15 - i) / 7) * 255);
            } else if (type === 'saw') {
                next[i] = Math.round((i / 15) * 255);
            } else if (type === 'square') {
                next[i] = i < 8 ? 255 : 0;
            } else if (type === 'silence') {
                next[i] = 0;
            }
        }
        setSamples(next);
    };

    const handleSave = () => {
        onSave(samples);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-card"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '680px',
                    maxWidth: '92vw',
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
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Edit Wave RAM Samples (0xFF30–0xFF3F)</h3>
                    </div>
                    <button onClick={onClose} className="btn-danger" style={{ padding: '4px' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Preset Generators */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', backgroundColor: '#11111b', padding: '8px 12px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#a6adc8', fontWeight: 'bold' }}>Presets:</span>
                    <button className="cmd-add-btn" onClick={() => applyPreset('sine')}>Sine</button>
                    <button className="cmd-add-btn" onClick={() => applyPreset('triangle')}>Triangle</button>
                    <button className="cmd-add-btn" onClick={() => applyPreset('saw')}>Sawtooth</button>
                    <button className="cmd-add-btn" onClick={() => applyPreset('square')}>Square</button>
                    <button className="cmd-add-btn" onClick={() => applyPreset('silence')}>Silence</button>
                </div>

                {/* 16 Vertical Sliders & Hex Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '6px', marginBottom: '24px' }}>
                    {samples.map((val, idx) => {
                        const hexAddr = (0x30 + idx).toString(16).toUpperCase();
                        const hexVal = val.toString(16).padStart(2, '0').toUpperCase();

                        return (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    backgroundColor: '#11111b',
                                    padding: '8px 2px',
                                    borderRadius: '6px',
                                    border: '1px solid #313244',
                                }}
                            >
                <span style={{ fontSize: '10px', color: '#89b4fa', fontFamily: 'monospace' }}>
                  3{hexAddr.slice(1)}
                </span>

                                <div style={{ height: '110px', display: 'flex', alignItems: 'center', margin: '8px 0' }}>
                                    <input
                                        type="range"
                                        min={0}
                                        max={255}
                                        value={val}
                                        onChange={(e) => handleSampleChange(idx, parseInt(e.target.value) || 0)}
                                        style={{
                                            writingMode: 'vertical-lr',
                                            direction: 'rtl',
                                            width: '16px',
                                            height: '100px',
                                            accentColor: '#fab387',
                                            cursor: 'pointer',
                                        }}
                                    />
                                </div>

                                <input
                                    type="text"
                                    value={`0x${hexVal}`}
                                    onChange={(e) => {
                                        const parsed = parseInt(e.target.value.replace(/^0x/i, ''), 16);
                                        handleSampleChange(idx, isNaN(parsed) ? 0 : parsed);
                                    }}
                                    style={{
                                        width: '32px',
                                        textAlign: 'center',
                                        backgroundColor: '#313244',
                                        border: '1px solid #45475a',
                                        color: '#f9e2af',
                                        fontFamily: 'monospace',
                                        fontSize: '10px',
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