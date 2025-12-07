import React from 'react';
import { motion } from 'framer-motion';
import { Check, User2 } from 'lucide-react';

interface ArtistSelectionProps {
    onConfirm: (artists: string[]) => void;
}

const ARTISTS = [
    { id: 'taylor_swift', name: 'Taylor Swift', color: 'bg-rose-100 text-rose-600 border-rose-200' },
    { id: 'jay_chou', name: 'Jay Chou', color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
    { id: 'bts', name: 'BTS', color: 'bg-purple-100 text-purple-600 border-purple-200' },
    { id: 'ed_sheeran', name: 'Ed Sheeran', color: 'bg-orange-100 text-orange-600 border-orange-200' },
    { id: 'adele', name: 'Adele', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
    { id: 'justin_bieber', name: 'Justin Bieber', color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { id: 'blackpink', name: 'BLACKPINK', color: 'bg-pink-100 text-pink-600 border-pink-200' },
    { id: 'mayday', name: 'Mayday', color: 'bg-sky-100 text-sky-600 border-sky-200' },
];

export const ArtistSelection: React.FC<ArtistSelectionProps> = ({ onConfirm }) => {
    const [selected, setSelected] = React.useState<string[]>([]);

    const toggleArtist = (id: string) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 space-y-4">
            <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
                    Pick Your Icons
                </h2>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Choose artists to customize your experience.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                {ARTISTS.map((artist, index) => {
                    const isSelected = selected.includes(artist.id);
                    return (
                        <motion.button
                            key={artist.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.03 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleArtist(artist.id)}
                            className={`
                relative px-3 py-2 rounded-xl border font-medium transition-all duration-200 text-sm
                ${isSelected
                                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-md'
                                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                                }
              `}
                        >
                            <div className="flex items-center justify-center gap-2">
                                {isSelected && <Check size={14} />}
                                <span className="truncate">{artist.name}</span>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            <button
                onClick={() => onConfirm(selected)}
                disabled={selected.length === 0}
                className={`w-full max-w-xs py-3 rounded-xl font-bold text-base transition-all
          ${selected.length > 0
                        ? 'bg-zinc-900 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                        : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                    }
        `}
            >
                Continue
            </button>
        </div>
    );
};
