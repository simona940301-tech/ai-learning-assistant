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
        <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
                    Pick Your Icons
                </h2>
                <p className="text-zinc-500 max-w-xs mx-auto">
                    We'll customize your vocabulary examples based on the lyrics of artists you love.
                </p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center max-w-sm">
                {ARTISTS.map((artist, index) => {
                    const isSelected = selected.includes(artist.id);
                    return (
                        <motion.button
                            key={artist.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleArtist(artist.id)}
                            className={`
                relative px-6 py-3 rounded-full border-2 font-medium transition-all duration-300
                ${isSelected
                                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-200/50'
                                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                                }
              `}
                        >
                            <div className="flex items-center gap-2">
                                {isSelected && <Check size={16} />}
                                {artist.name}
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            <button
                onClick={() => onConfirm(selected)}
                disabled={selected.length === 0}
                className={`w-full max-w-xs py-4 rounded-2xl font-bold text-lg transition-all
          ${selected.length > 0
                        ? 'bg-zinc-900 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1'
                        : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                    }
        `}
            >
                Continue
            </button>
        </div>
    );
};
