'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface PostComposerProps {
    user?: {
        name: string
        avatar?: string | null
    }
    onPostCreated?: () => void
    className?: string
}

export function PostComposer({ user, onPostCreated, className }: PostComposerProps) {
    const router = useRouter()
    const [content, setContent] = useState('')
    const [images, setImages] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isFocused, setIsFocused] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleImageUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return

        const remainingSlots = 4 - images.length
        if (files.length > remainingSlots) {
            setError(`最多只能上傳 4 張圖片`)
            return
        }

        setIsUploading(true)
        setError(null)
        const newImages: string[] = []

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const formData = new FormData()
                formData.append('file', file)

                const response = await fetch('/api/community/posts/upload-image', {
                    method: 'POST',
                    body: formData,
                })

                if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.message || '上傳失敗')
                }

                const data = await response.json()
                if (data.url) {
                    newImages.push(data.url)
                }
            }

            setImages([...images, ...newImages])
        } catch (err) {
            console.error('Upload error:', err)
            setError(err instanceof Error ? err.message : '上傳失敗')
        } finally {
            setIsUploading(false)
        }
    }

    const handleRemoveImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if (!content.trim() && images.length === 0) return

        setIsSubmitting(true)
        setError(null)

        try {
            const response = await fetch('/api/community/posts/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content.trim(),
                    images,
                    is_anonymous: false,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.message || '發佈失敗')
            }

            // Reset form
            setContent('')
            setImages([])
            setIsFocused(false)

            // Notify parent
            onPostCreated?.()

            // Refresh page to show new post
            router.refresh()
        } catch (err) {
            console.error('Post creation error:', err)
            setError(err instanceof Error ? err.message : '發佈失敗，請稍後再試')
        } finally {
            setIsSubmitting(false)
        }
    }

    const charCount = content.length
    const maxChars = 500
    const isOverLimit = charCount > maxChars
    const canSubmit = (content.trim().length > 0 || images.length > 0) && !isOverLimit && !isSubmitting

    return (
        <div className={className}>
            <div className="flex gap-3">
                {/* Avatar */}
                <Avatar className="h-10 w-10 flex-shrink-0 mt-1">
                    <AvatarImage src={user?.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {user?.name?.[0] || 'U'}
                    </AvatarFallback>
                </Avatar>

                {/* Composer */}
                <div className="flex-1 min-w-0">
                    {/* Text Input */}
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        placeholder="有什麼新鮮事？"
                        className="w-full min-h-[60px] max-h-[300px] resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground/60 pt-3"
                        disabled={isSubmitting}
                        style={{
                            height: 'auto',
                            minHeight: isFocused || content || images.length > 0 ? '100px' : '60px'
                        }}
                    />

                    {/* Image Preview Grid */}
                    <AnimatePresence>
                        {images.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`mt-3 grid gap-2 ${images.length === 1 ? 'grid-cols-1' :
                                        images.length === 2 ? 'grid-cols-2' :
                                            'grid-cols-2'
                                    }`}
                            >
                                {images.map((url, index) => (
                                    <div key={url} className="relative aspect-video overflow-hidden rounded-2xl bg-muted group border border-border">
                                        <img src={url} alt={`Upload ${index + 1}`} className="h-full w-full object-cover" />
                                        <button
                                            onClick={() => handleRemoveImage(index)}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-2 text-sm text-destructive"
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Actions Bar - Only show when focused or has content */}
                    <AnimatePresence>
                        {(isFocused || content || images.length > 0) && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center justify-between pt-3 mt-3 border-t border-border"
                            >
                                <div className="flex items-center gap-1">
                                    {/* Image Upload Button */}
                                    <label className={`p-2 rounded-full hover:bg-blue-500/10 transition-colors cursor-pointer ${isUploading || images.length >= 4 ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                            multiple
                                            onChange={(e) => handleImageUpload(e.target.files)}
                                            disabled={isUploading || images.length >= 4}
                                            className="hidden"
                                        />
                                        <ImageIcon className="h-[18px] w-[18px] text-blue-500" />
                                    </label>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Character Count */}
                                    {charCount > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-xs ${isOverLimit
                                                        ? 'text-destructive font-medium'
                                                        : charCount > maxChars * 0.9
                                                            ? 'text-orange-500'
                                                            : 'text-muted-foreground'
                                                    }`}
                                            >
                                                {charCount > maxChars * 0.8 && `${charCount}/${maxChars}`}
                                            </span>
                                            {charCount > maxChars * 0.8 && (
                                                <div className="relative h-5 w-5">
                                                    <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20">
                                                        <circle
                                                            cx="10"
                                                            cy="10"
                                                            r="8"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            fill="none"
                                                            className="text-muted-foreground/20"
                                                        />
                                                        <circle
                                                            cx="10"
                                                            cy="10"
                                                            r="8"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            fill="none"
                                                            strokeDasharray={`${(charCount / maxChars) * 50.27} 50.27`}
                                                            className={isOverLimit ? 'text-destructive' : 'text-blue-500'}
                                                        />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={!canSubmit}
                                        size="sm"
                                        className="rounded-full px-4 h-9 font-semibold"
                                    >
                                        {isSubmitting ? (
                                            <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                        ) : (
                                            '發佈'
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
