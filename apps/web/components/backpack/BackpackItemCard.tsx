'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { BookText, AlertCircle, FileText, ListChecks, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type BackpackItemType = 'vocabulary' | 'error_book' | 'note' | 'question_set';

interface BackpackItemCardProps {
    type: BackpackItemType;
    title: string;
    subtitle?: string; // e.g., definition for vocabulary
    level?: string; // e.g., "Lv2" for vocabulary
    tags?: string[];
    source?: string; // e.g., "來自 2024/12/08 練習"
    createdAt: string;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    onDelete?: () => void;
    children?: React.ReactNode; // Expanded content
}

/**
 * BackpackItemCard - Unified card component for all backpack content types
 * 
 * Ensures semantic unity across:
 * - Vocabulary notebook
 * - Error book (wrong answers)
 * - Study notes
 * - Question sets
 * 
 * Features:
 * - Consistent visual language
 * - Collapsed/expanded states
 * - Delete with hover effect
 * - Smooth animations
 * - Mobile-first responsive
 */
export function BackpackItemCard({
    type,
    title,
    subtitle,
    level,
    tags,
    source,
    createdAt,
    isExpanded = false,
    onToggleExpand,
    onDelete,
    children,
}: BackpackItemCardProps) {
    const getIcon = () => {
        switch (type) {
            case 'vocabulary': return BookText;
            case 'error_book': return AlertCircle;
            case 'note': return FileText;
            case 'question_set': return ListChecks;
        }
    };

    const Icon = getIcon();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-border rounded-xl bg-card overflow-hidden"
        >
            {/* Collapsed View */}
            <div
                onClick={onToggleExpand}
                className={cn(
                    "flex items-start gap-3 p-4 transition-colors",
                    onToggleExpand && "cursor-pointer hover:bg-muted/50"
                )}
            >
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-base text-foreground truncate">
                            {title}
                        </h3>
                        {level && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold flex-shrink-0">
                                {level}
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                            {subtitle}
                        </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        {source && <span>{source}</span>}
                        {source && <span>•</span>}
                        <span>{createdAt}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                            aria-label="刪除"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    {onToggleExpand && (
                        <ChevronDown
                            className={cn(
                                "w-5 h-5 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180"
                            )}
                        />
                    )}
                </div>
            </div>

            {/* Expanded View */}
            <AnimatePresence>
                {isExpanded && children && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border bg-muted/30 overflow-hidden"
                    >
                        <div className="p-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
