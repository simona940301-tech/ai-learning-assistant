'use client'

import { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ImageUploaderProps {
    images: string[]
    onImagesChange: (images: string[]) => void
    maxImages?: number
}

export function ImageUploader({ images, onImagesChange, maxImages = 4 }: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
    const [error, setError] = useState<string | null>(null)

    const uploadImage = async (file: File): Promise<string | null> => {
        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('/api/community/posts/upload-image', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.message || '上傳失敗')
            }

            const data = await response.json()
            return data.url
        } catch (err) {
            console.error('Upload error:', err)
            throw err
        }
    }

    const handleFileSelect = useCallback(
        async (files: FileList | null) => {
            if (!files || files.length === 0) return

            setError(null)

            // Check if adding these files would exceed max images
            const remainingSlots = maxImages - images.length
            if (files.length > remainingSlots) {
                setError(`最多只能上傳 ${maxImages} 張圖片`)
                return
            }

            setUploading(true)
            const newImages: string[] = []

            try {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i]
                    const fileId = `${Date.now()}-${i}`

                    // Simulate progress
                    setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }))

                    const progressInterval = setInterval(() => {
                        setUploadProgress((prev) => {
                            const current = prev[fileId] || 0
                            if (current >= 90) {
                                clearInterval(progressInterval)
                                return prev
                            }
                            return { ...prev, [fileId]: current + 10 }
                        })
                    }, 100)

                    const url = await uploadImage(file)

                    clearInterval(progressInterval)
                    setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))

                    if (url) {
                        newImages.push(url)
                    }

                    // Clean up progress after a delay
                    setTimeout(() => {
                        setUploadProgress((prev) => {
                            const next = { ...prev }
                            delete next[fileId]
                            return next
                        })
                    }, 500)
                }

                onImagesChange([...images, ...newImages])
            } catch (err) {
                setError(err instanceof Error ? err.message : '上傳失敗')
            } finally {
                setUploading(false)
            }
        },
        [images, maxImages, onImagesChange]
    )

    const handleRemoveImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index)
        onImagesChange(newImages)
    }

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            handleFileSelect(e.dataTransfer.files)
        },
        [handleFileSelect]
    )

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const canAddMore = images.length < maxImages

    return (
        <div className="space-y-3">
            {/* Image Grid */}
            {images.length > 0 && (
                <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' :
                        images.length === 2 ? 'grid-cols-2' :
                            'grid-cols-2'
                    }`}>
                    <AnimatePresence>
                        {images.map((url, index) => (
                            <motion.div
                                key={url}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="relative aspect-square overflow-hidden rounded-lg bg-muted group"
                            >
                                <img
                                    src={url}
                                    alt={`Upload ${index + 1}`}
                                    className="h-full w-full object-cover"
                                />
                                <button
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Upload Button */}
            {canAddMore && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="relative"
                >
                    <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files)}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    <div className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer">
                        {uploading ? (
                            <>
                                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                <span className="text-sm text-muted-foreground">上傳中...</span>
                            </>
                        ) : (
                            <>
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    新增圖片 ({images.length}/{maxImages})
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
                <div className="space-y-2">
                    {Object.entries(uploadProgress).map(([id, progress]) => (
                        <div key={id} className="space-y-1">
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-primary"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive"
                >
                    {error}
                </motion.div>
            )}
        </div>
    )
}
