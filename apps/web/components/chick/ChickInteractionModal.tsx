import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, Map, Utensils, MessageCircle, AlertCircle, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useChickStore } from '@/src/store/chickStore'
import { getChickImagePath } from '@/components/chick/chickImage'
import type { ChickState } from '@/packages/server/chick/types'
import Image from 'next/image'
import { toast } from 'sonner'
import { usePlay } from '@/lib/play-context'
import { useRouter } from 'next/navigation'

interface ChickInteractionModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ChickInteractionModal({ isOpen, onClose }: ChickInteractionModalProps) {
    const {
        hunger,
        intimacy,
        foodBowlsCount,
        feed,
        iq,
        fatigue,
        emotionState
    } = useChickStore()

    // Use stored state for image
    const chickState: ChickState = { iq, fatigue, emotionState }

    // Determine image source: if very hungry (>=90), show 'sick' state to indicate weakness
    // 'sick' is the most appropriate ChickEmotion state for showing a hungry/weak chick
    const effectiveEmotion = hunger >= 90 ? 'sick' : emotionState
    const imgSrc = getChickImagePath({ ...chickState, emotionState: effectiveEmotion })

    const [activeTab, setActiveTab] = useState<'care' | 'explore'>('care')
    const router = useRouter()

    // Dynamic Tone-of-Vice & Bubble
    let bubbleText = "Master..."
    if (hunger >= 80) bubbleText = "Master... 沒力氣了..."
    else if (hunger >= 50) bubbleText = "肚子有點餓..."
    else bubbleText = "I feel great!"

    // Handle Actions
    const handleFeed = async () => {
        if (foodBowlsCount > 0) {
            await feed()
            toast.success("Yummy! 體力恢復了！", {
                icon: '🍗',
                style: { background: '#AED581', color: '#1B5E20', border: 'none' }
            })
        } else {
            // Should not happen if UI is correct (button changes), but safeguard
            toast("沒有飼料了...", { description: "快去對戰賺取飼料吧！" })
        }
    }

    const handleGoToBattle = () => {
        onClose()
        // Determine where to go? Simply close might be enough as "Play" page is underneath?
        // Or scroll to battle section? 
        // Let's just close for now as users are likely ON the play page.
        // Or if we want to be explicit:
        // router.push('/play?mode=battle') 
        // But simply closing to let them pick a mode on the play page (which is underneath) is good UX "Go earn feed".
        // Actually, let's just close with a toast hint.
        toast("去對戰賺取飼料吧！", { icon: '⚔️' })
    }

    // Tabs - "Segmented Control" style
    const TabButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`
                relative px-6 py-1.5 text-sm font-bold transition-all rounded-full z-10
                ${activeTab === id ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}
            `}
        >
            {activeTab === id && (
                <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white shadow-sm rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
            )}
            {label}
        </button>
    )

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
                    />

                    {/* Modal Card - Floating Center */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-[340px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[32px] bg-[#F2F1ED] shadow-2xl p-6 flex flex-col items-center gap-6"
                    >
                        {/* 1. Header (Tabs & Close) */}
                        <div className="flex w-full items-center justify-between">
                            {/* Segmented Control */}
                            <div className="flex items-center bg-slate-200/50 p-1 rounded-full">
                                <TabButton id="care" label="小雞" />
                                <TabButton id="explore" label="探索" />
                            </div>

                            {/* Close X */}
                            <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* 2. The Stage (Hero Section) */}
                        <div className="relative flex flex-col items-center justify-center w-full mt-2">
                            {/* Speech Bubble */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm border border-slate-100 relative"
                            >
                                {bubbleText}
                                <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white border-b border-r border-slate-100"></div>
                            </motion.div>

                            {/* Chick Image - Larger */}
                            <div className="relative h-32 w-32 filter drop-shadow-xl">
                                <Image
                                    src={imgSrc}
                                    alt="Chick"
                                    fill
                                    className={`object-contain ${hunger >= 90 ? 'grayscale-[0.3]' : ''}`} // Slight effect for hunger
                                    priority
                                />
                            </div>

                            {/* Slim Hunger Bar */}
                            <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-6 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${hunger > 80 ? 'bg-orange-400' : 'bg-green-400'}`}
                                    style={{ width: `${100 - hunger}%` }} // "Fullness" = 100 - hunger
                                />
                            </div>
                        </div>

                        {/* 3. The Control (Bottom Action) */}
                        <div className="w-full mt-2">
                            {activeTab === 'care' ? (
                                <div className="flex items-center gap-3">
                                    {/* Inventory Count - Styled as Trigger */}
                                    <button
                                        className="flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-95 transition-transform"
                                        onClick={() => {
                                            if (foodBowlsCount === 0) {
                                                toast("贏得對戰 +3 / 每日任務 +5", {
                                                    style: { background: 'rgba(0,0,0,0.8)', color: 'white', border: 'none' },
                                                    position: 'top-center'
                                                })
                                            }
                                        }}
                                    >
                                        <span className="text-xl">🍗</span>
                                        <span className={`text-[10px] font-black ${foodBowlsCount === 0 ? 'text-red-400' : 'text-slate-600'}`}>
                                            {foodBowlsCount}
                                        </span>
                                    </button>

                                    {/* Main Action Button */}
                                    {foodBowlsCount > 0 ? (
                                        <Button
                                            onClick={handleFeed}
                                            className="flex-1 h-14 rounded-2xl bg-amber-400 text-amber-950 font-black text-lg shadow-[0_4px_0_#D97706] hover:bg-amber-300 active:translate-y-[2px] active:shadow-[0_0px_0_#D97706] transition-all"
                                        >
                                            餵食 (-20餓)
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleGoToBattle}
                                            className="flex-1 h-14 rounded-2xl bg-slate-800 text-white font-bold text-lg shadow-[0_4px_0_#000] hover:bg-slate-700 active:translate-y-[2px] active:shadow-[0_0px_0_#000] transition-all"
                                        >
                                            去對戰賺飼料 ➔
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[72px] text-center text-slate-400 text-sm">
                                    <p>探索功能維護中...</p>
                                    <p className="text-xs">請先照顧好小雞吧！</p>
                                </div>
                            )}
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
