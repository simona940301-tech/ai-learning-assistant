'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { getChickImagePath } from '@/components/chick/chickImage'

interface PurposeDeclarationProps {
    chickName: string
    userNickname: string
    onComplete: () => void
}

export function PurposeDeclaration({ chickName, userNickname, onComplete }: PurposeDeclarationProps) {
    return (
        <div className="w-full max-w-md mx-auto px-6 flex flex-col items-center">
            {/* Chick */}
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                }}
                className="relative w-32 h-32 mb-6"
            >
                <Image
                    src={getChickImagePath({ iq: 5, fatigue: 0, emotionState: 'normal' })}
                    alt={chickName}
                    fill
                    className="object-contain"
                    priority
                />

                {/* Sparkle effect */}
                <motion.div
                    className="absolute inset-0 bg-gradient-radial from-[#FFB01A]/30 to-transparent rounded-full blur-xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                    }}
                />
            </motion.div>

            {/* Message */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4 mb-8"
            >
                <h2 className="text-2xl font-bold text-[#1C1917] text-center">
                    {chickName} 的使命
                </h2>

                <div className="bg-[#FFFBF0] border border-[#E0D0B8] rounded-2xl p-6 space-y-3">
                    <p className="text-base text-[#1C1917] leading-relaxed">
                        {userNickname}，我會陪你一起學習！
                    </p>

                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#7CB342] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-sm text-[#57534E]">
                            你學得越好，我就越聰明
                        </p>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#FF9800] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <p className="text-sm text-[#57534E]">
                            但如果你偷懶... 我也會變笨
                        </p>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#FFB01A] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <p className="text-sm text-[#57534E]">
                            讓我們一起加油吧！
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* IQ Meter Animation */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="w-full mb-8"
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#57534E]">智慧值</span>
                    <span className="text-sm font-bold text-[#FFB01A]">5 / 10</span>
                </div>

                <div className="h-3 bg-[#E7E5E4] rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '50%' }}
                        transition={{
                            delay: 0.8,
                            duration: 1.5,
                            ease: 'easeOut',
                        }}
                        className="h-full bg-gradient-to-r from-[#FFB01A] to-[#FF9800] rounded-full"
                    />
                </div>
            </motion.div>

            {/* CTA Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="w-full"
            >
                <Button
                    onClick={onComplete}
                    className="w-full h-12 text-base font-bold bg-[#FFB01A] hover:bg-[#E69500] text-white shadow-lg"
                >
                    開始冒險
                </Button>
            </motion.div>

            {/* Progress indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="mt-6 flex items-center justify-center gap-1.5"
            >
                <div className="h-1.5 w-1.5 rounded-full bg-[#E7E5E4]" />
                <div className="h-1.5 w-1.5 rounded-full bg-[#E7E5E4]" />
                <div className="h-1.5 w-1.5 rounded-full bg-[#E7E5E4]" />
                <div className="h-1.5 w-6 rounded-full bg-[#FFB01A]" />
            </motion.div>
        </div>
    )
}
