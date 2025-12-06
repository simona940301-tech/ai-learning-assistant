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
        <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-8 overflow-y-auto">
            <div className="text-center space-y-2 mt-4">
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
                    Select Your Range
                </h2>
                <p className="text-zinc-500 max-w-xs mx-auto">
                    Choose one or more difficulty levels.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {LEVELS.map((level, index) => {
                    const isSelected = selected.includes(level.id);
                    const Icon = level.icon;

                    return (
                        <motion.button
                            key={level.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => toggleLevel(level.id)}
                            className={`
                relative p-4 rounded-2xl text-left border-2 transition-all duration-300 flex items-center gap-4 group
                ${isSelected
                                    ? 'border-zinc-900 bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-100'
                                    : 'border-transparent bg-white shadow-sm hover:shadow-md hover:scale-[1.02]'
                                }
              `}
                        >
                            <div className={`p-3 rounded-xl ${level.color} text-white shadow-lg shadow-${level.color}/30`}>
                                <Icon size={24} />
                            </div>

                            <div className="flex-1">
                                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{level.title}</h3>
                                <div className="text-xs font-mono text-zinc-400 mt-1">{level.range}</div>
                                <div className="text-xs text-zinc-500 mt-0.5">{level.desc}</div>
                            </div>

                            {isSelected && (
                                <div className="absolute right-4 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                                    ✓
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            <button
                onClick={() => selected.length > 0 && onConfirm(selected)}
                disabled={selected.length === 0}
                className={`w-full max-w-xs py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 mb-4
          ${selected.length > 0
                        ? 'bg-zinc-900 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1'
                        : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                    }
        `}
            >
                <BrainCircuit size={20} />
                Start Flow ({selected.length})
            </button>
        </div>
    );
};
