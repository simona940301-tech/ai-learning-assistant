import React from 'react';
import { motion } from 'framer-motion';
import { SignalHigh, SignalMedium, SignalLow, BrainCircuit } from 'lucide-react';

interface LevelSelectionProps {
    onConfirm: (levels: string[]) => void;
}

const LEVELS = [
    {
        id: 'Level 2',
        title: 'Beginner Flow',
        range: '1000-2000 Words',
        desc: 'Perfect for building a solid foundation.',
        icon: SignalLow,
        color: 'bg-emerald-500'
    },
    {
        id: 'Level 3',
        title: 'Chart Topper',
        range: '2000-3000 Words',
        desc: 'Most common pop song lyrics found here.',
        icon: SignalMedium,
        color: 'bg-sky-500'
    },
    {
        id: 'Level 4',
        title: 'Lyrical Genius',
        range: '3000-4000 Words',
        desc: 'Deep, emotional, and expressive vocabulary.',
        icon: SignalHigh,
        color: 'bg-purple-500'
    },
];

export const LevelSelection: React.FC<LevelSelectionProps> = ({ onConfirm }) => {
    const [selected, setSelected] = React.useState<string | null>(null);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
                    Select Your Range
                </h2>
                <p className="text-zinc-500 max-w-xs mx-auto">
                    Choose a difficulty that challenges you but keeps the flow going.
                </p>
            </div>

            <div className="grid gap-4 w-full max-w-sm">
                {LEVELS.map((level, index) => {
                    const isSelected = selected === level.id;
                    const Icon = level.icon;

                    return (
                        <motion.button
                            key={level.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => setSelected(level.id)}
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
                            </div>

                            {isSelected && (
                                <div className="absolute right-4 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                            )}
                        </motion.button>
                    );
                })}
            </div>

            <button
                onClick={() => selected && onConfirm([selected])}
                disabled={!selected}
                className={`w-full max-w-xs py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2
          ${selected
                        ? 'bg-zinc-900 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1'
                        : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                    }
        `}
            >
                <BrainCircuit size={20} />
                Start Flow
            </button>
        </div>
    );
};
