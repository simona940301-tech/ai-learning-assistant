'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageGalleryProps {
    images: string[]
    initialIndex?: number
    isOpen: boolean
    onClose: () => void
}

export function ImageGallery({ images, initialIndex = 0, isOpen, onClose }: ImageGalleryProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)

    useEffect(() => {
        setCurrentIndex(initialIndex)
    }, [initialIndex])

    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'ArrowLeft') {
                handlePrevious()
            } else if (e.key === 'ArrowRight') {
                handleNext()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, currentIndex])

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    }

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                onClick={onClose}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                >
                    <X className="h-6 w-6" />
                </button>

                {/* Image Counter */}
                {images.length > 1 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm z-10">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}

                {/* Previous Button */}
                {images.length > 1 && currentIndex > 0 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            handlePrevious()
                        }}
                        className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                )}

                {/* Next Button */}
                {images.length > 1 && currentIndex < images.length - 1 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            handleNext()
                        }}
                        className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                )}

                {/* Image */}
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-[90vw] max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <img
                        src={images[currentIndex]}
                        alt={`Image ${currentIndex + 1}`}
                        className="max-w-full max-h-[90vh] object-contain rounded-lg"
                    />
                </motion.div>

                {/* Thumbnail Strip (if multiple images) */}
                {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                        {images.map((img, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setCurrentIndex(index)
                                }}
                                className={`w-12 h-12 rounded overflow-hidden transition-all ${index === currentIndex
                                        ? 'ring-2 ring-white scale-110'
                                        : 'opacity-60 hover:opacity-100'
                                    }`}
                            >
                                <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    )
}
