'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Share2, MoreHorizontal, Edit2, Trash2, HelpCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'

interface PostCardProps {
    post: {
        id: string
        user: {
            id?: string
            name: string
            avatar: string | null
            is_anonymous: boolean
        }
        content: string
        images: string[]
        likes: number
        is_liked_by_me: boolean
        is_author: boolean
        created_at: string
        question_metadata?: any
        is_question_post?: boolean
    }
    onLikeToggle?: (postId: string, liked: boolean) => void
    onDelete?: (postId: string) => void
    onImageClick?: (images: string[], index: number) => void
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '剛剛'
    if (diffMins < 60) return `${diffMins}分鐘前`
    if (diffHours < 24) return `${diffHours}小時前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-TW')
}

export function PostCard({ post, onLikeToggle, onDelete, onImageClick }: PostCardProps) {
    const router = useRouter()
    const [isLiked, setIsLiked] = useState(post.is_liked_by_me)
    const [likeCount, setLikeCount] = useState(post.likes)
    const [isLiking, setIsLiking] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleLike = async () => {
        if (isLiking) return

        setIsLiking(true)
        const previousLiked = isLiked
        const previousCount = likeCount

        // Optimistic update
        setIsLiked(!isLiked)
        setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)

        try {
            const response = await fetch(`/api/community/posts/${post.id}/like`, {
                method: 'POST',
            })

            if (!response.ok) {
                throw new Error('Failed to like post')
            }

            const data = await response.json()
            setIsLiked(data.liked)
            setLikeCount(data.likes)
            onLikeToggle?.(post.id, data.liked)
        } catch (error) {
            console.error('Like error:', error)
            // Revert on error
            setIsLiked(previousLiked)
            setLikeCount(previousCount)
        } finally {
            setIsLiking(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('確定要刪除這篇貼文嗎？')) return

        setIsDeleting(true)

        try {
            const response = await fetch(`/api/community/posts/${post.id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Failed to delete post')
            }

            onDelete?.(post.id)
            router.refresh()
        } catch (error) {
            console.error('Delete error:', error)
            alert('刪除失敗，請稍後再試')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <article className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex gap-3">
                {/* Avatar */}
                <Avatar className="h-10 w-10 flex-shrink-0">
                    {post.user.is_anonymous ? (
                        <AvatarFallback className="bg-muted text-muted-foreground">?</AvatarFallback>
                    ) : (
                        <>
                            <AvatarImage src={post.user.avatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                {post.user.name[0]}
                            </AvatarFallback>
                        </>
                    )}
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                                {post.user.is_anonymous ? '匿名用戶' : post.user.name}
                            </span>
                            {post.is_question_post && (
                                <span className="flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-500">
                                    <HelpCircle className="h-3 w-3" />
                                    求助學霸
                                </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(post.created_at)}
                            </span>
                        </div>

                        {/* More Menu (only for author) */}
                        {post.is_author && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="p-1 rounded-full hover:bg-muted transition-colors">
                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleDelete} disabled={isDeleting}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        刪除
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {/* Text Content */}
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">
                        {post.content}
                    </p>

                    {/* Images */}
                    {post.images.length > 0 && (
                        <div
                            className={`mt-3 grid gap-1 rounded-xl overflow-hidden ${post.images.length === 1
                                    ? 'grid-cols-1'
                                    : post.images.length === 2
                                        ? 'grid-cols-2'
                                        : 'grid-cols-2'
                                }`}
                        >
                            {post.images.map((img, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onImageClick?.(post.images, i)}
                                    className="aspect-square overflow-hidden bg-muted cursor-pointer"
                                >
                                    <img
                                        src={img}
                                        alt={`Image ${i + 1}`}
                                        className="h-full w-full object-cover"
                                    />
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex gap-6">
                        {/* Like Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleLike}
                            disabled={isLiking}
                            className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-red-500 group"
                        >
                            <Heart
                                className={`h-5 w-5 transition-all ${isLiked
                                        ? 'fill-red-500 text-red-500'
                                        : 'group-hover:fill-red-500/20'
                                    }`}
                            />
                            {likeCount > 0 && (
                                <span className="text-sm">{likeCount}</span>
                            )}
                        </motion.button>

                        {/* Comment Button (placeholder) */}
                        <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                            <MessageCircle className="h-5 w-5" />
                        </button>

                        {/* Share Button (placeholder) */}
                        <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                            <Share2 className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </article>
    )
}
