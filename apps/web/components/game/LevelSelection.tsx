import React from 'react';
import { motion } from 'framer-motion';
import { SignalHigh, SignalMedium, SignalLow, BrainCircuit } from 'lucide-react';

interface LevelSelectionProps {
    onConfirm: (levels: string[]) => void;
}

const LEVELS = [
    {
        id: '1',
        title: 'Starter',
        titleZh: '基礎必備',
        level: 1,
    },
    {
        id: '2',
        title: 'Beginner Flow',
        titleZh: '初級進階',
        level: 2,
    },
    {
        id: '3',
        title: 'Chart Topper',
        titleZh: '流行歌詞',
        level: 3,
    },
    {
        id: '4',
        title: 'Lyrical Genius',
        titleZh: '深度表達',
        level: 4,
    },
    {
        id: '5',
        title: 'Advanced',
        titleZh: '進階應用',
        level: 5,
    },
    {
        id: '6',
        title: 'Expert',
        titleZh: '專精掌握',
        level: 6,
    },
];

export const LevelSelection: React.FC<LevelSelectionProps> = ({ onConfirm }) => {
    const [selected, setSelected] = React.useState<string[]>([]);

    const toggleLevel = (id: string) => {
        if (selected.includes(id)) {
            setSelected(selected.filter(l => l !== id));
        } else {
            setSelected([...selected, id]);
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                    選擇難度範圍
                </h2>
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    選擇你想練習的難度等級
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                {LEVELS.map((level, index) => {
                    const isSelected = selected.includes(level.id);

                    return (
                        <motion.button
                            key={level.id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: index * 0.05, type: 'spring', stiffness: 400, damping: 30 }}
                            onClick={() => toggleLevel(level.id)}
                            className={`
                relative p-4 rounded-2xl text-left border-2 transition-all duration-200 flex flex-col gap-3 h-auto
                ${isSelected
                                    ? 'border-[hsl(var(--foreground))] bg-[hsl(var(--muted))]'
                                    : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--muted-foreground))]'
                                }
              `}
                            style={{
                                boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : '0 2px 4px rgba(0,0,0,0.04)'
                            }}
                        >
                            {/* Level Number Badge */}
                            <div className="flex items-center justify-between w-full">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg"
                                    style={{
                                        backgroundColor: isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--muted))',
                                        color: isSelected ? 'hsl(var(--background))' : 'hsl(var(--foreground))'
                                    }}
                                >
                                    {level.level}
                                </div>
                                {isSelected && (
                                    <div
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                        style={{ backgroundColor: 'hsl(var(--accent))' }}
                                    >
                                        ✓
                                    </div>
                                )}
                            </div>

                            {/* Bilingual Title */}
                            <div className="w-full">
                                <h3 className="font-bold text-base leading-tight" style={{ color: 'hsl(var(--foreground))' }}>
                                    {level.title}
                                </h3>
                                <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    {level.titleZh}
                                </p>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            <button
                onClick={() => selected.length > 0 && onConfirm(selected)}
                disabled={selected.length === 0}
                className="w-full max-w-xs py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2"
                style={{
                    backgroundColor: selected.length > 0 ? 'hsl(var(--foreground))' : 'hsl(var(--muted))',
                    color: selected.length > 0 ? 'hsl(var(--background))' : 'hsl(var(--muted-foreground))',
                    cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: selected.length > 0 ? '0 8px 16px rgba(0,0,0,0.12)' : 'none',
                    transform: selected.length > 0 ? 'translateY(0)' : 'none'
                }}
                onMouseEnter={(e) => {
                    if (selected.length > 0) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (selected.length > 0) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
                    }
                }}
            >
                <BrainCircuit size={20} />
                開始練習 ({selected.length})
            </button>
        </div>
    );
};
