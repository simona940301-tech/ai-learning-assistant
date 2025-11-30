"use client"

import { motion } from "framer-motion"
import { Utensils, Gift } from "lucide-react"
import Image from "next/image"

type StatusType = 'hungry' | 'exploring' | 'returned' | null

interface ChickStatusIndicatorsProps {
    status: StatusType
    onClick?: () => void
}

export function ChickStatusIndicators({ status, onClick }: ChickStatusIndicatorsProps) {
    if (!status) return null

    return (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full flex justify-center">
            <motion.div
                initial={{ scale: 0, y: 10, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0, y: 10, opacity: 0 }}
                className="relative"
            >
                {/* Hunger Indicator */}
                {status === 'hungry' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onClick?.()
                        }}
                        className="pointer-events-auto relative group"
                    >
                        <div className="absolute -inset-1 bg-red-500/20 rounded-full animate-ping" />
                        <div className="relative flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-lg border-2 border-orange-100">
                            <Utensils className="w-5 h-5 text-orange-500" />

                            {/* Circular Progress (Simulated) */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                                <circle
                                    cx="20"
                                    cy="20"
                                    r="18"
                                    fill="none"
                                    stroke="#fed7aa"
                                    strokeWidth="2"
                                    className="opacity-30"
                                />
                                <circle
                                    cx="20"
                                    cy="20"
                                    r="18"
                                    fill="none"
                                    stroke="#f97316"
                                    strokeWidth="2"
                                    strokeDasharray="113"
                                    strokeDashoffset="80" // ~30%
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-black/70 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            餓了...
                        </div>
                    </button>
                )}

                {/* Exploring Indicator */}
                {status === 'exploring' && (
                    <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="flex flex-col items-center"
                    >
                        <div className="relative flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-blue-100">
                            <Image
                                src="/chicks/travel.png"
                                alt="Travel"
                                width={20}
                                height={20}
                                className="object-contain"
                            />
                        </div>
                        <div className="mt-1 px-2 py-0.5 bg-blue-500/80 text-white text-[10px] font-bold rounded-full shadow-sm backdrop-blur-sm">
                            探險中
                        </div>
                    </motion.div>
                )}

                {/* Returned Indicator */}
                {status === 'returned' && (
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation()
                            onClick?.()
                        }}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                        className="pointer-events-auto flex flex-col items-center group"
                    >
                        <div className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-full shadow-xl border-2 border-yellow-200">
                            <Gift className="w-6 h-6 text-yellow-600" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" />
                        </div>
                        <div className="mt-1 px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                            領取獎勵!
                        </div>
                    </motion.button>
                )}
            </motion.div>
        </div>
    )
}
