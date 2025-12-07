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
        range: 'Level 1',
        desc: 'Essential daily vocabulary.',
        icon: SignalLow,
        color: 'bg-emerald-400'
    },
    {
        id: '2',
        title: 'Beginner Flow',
        range: 'Level 2',
        desc: 'Build your foundation.',
        icon: SignalLow,
        color: 'bg-emerald-500'
    },
    {
        id: '3',
        title: 'Chart Topper',
        range: 'Level 3',
        desc: 'Common pop lyrics.',
        icon: SignalMedium,
        color: 'bg-sky-500'
    },
    {
        id: '4',
        title: 'Lyrical Genius',
        range: 'Level 4',
        desc: 'Deep and expressive.',
        icon: SignalHigh,
        color: 'bg-purple-500'
    },
    {
        id: '5',
        title: 'Advanced',
        range: 'Level 5',
        desc: 'Sophisticated usage.',
        icon: BrainCircuit,
        color: 'bg-indigo-500'
    },
    {
        id: '6',
        title: 'Expert',
        range: 'Level 6',
        desc: 'Mastery level.',
        icon: BrainCircuit,
        color: 'bg-rose-500'
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
        <div className="w-full h-full flex flex-col items-center justify-center p-4 space-y-4">
            <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    Select Range
                </h2>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Select difficulty levels.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                {LEVELS.map((level, index) => {
                    const isSelected = selected.includes(level.id);
                    const Icon = level.icon;

                    return (
                        <motion.button
                            key={level.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => toggleLevel(level.id)}
                            className={`
                relative p-3 rounded-xl text-left border transition-all duration-200 flex flex-col gap-2 group h-auto
                ${isSelected
                                    ? 'border-zinc-900 bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-100'
                                    : 'border-transparent bg-white shadow-sm hover:shadow-md'
                                }
              `}
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className={`p-2 rounded-lg ${level.color} text-white shadow-sm`}>
                                    <Icon size={18} />
                                </div>
                                {isSelected && (
                                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px]">
                                        ✓
                                    </div>
                                )}
                            </div>

                            <div className="w-full">
                                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-tight">{level.title}</h3>
                                <div className="text-[10px] text-zinc-500 mt-1 leading-snug truncate">{level.desc}</div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            <button
                onClick={() => selected.length > 0 && onConfirm(selected)}
                disabled={selected.length === 0}
                className={`w-full max-w-xs py-3 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2
          ${selected.length > 0
                        ? 'bg-zinc-900 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                        : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                    }
        `}
            >
                <BrainCircuit size={18} />
                Start Flow ({selected.length})
            </button>
        </div>
    );
};
