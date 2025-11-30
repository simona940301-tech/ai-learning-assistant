"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

export type ParticleType = 'heart' | 'star'

interface Particle {
    id: number
    x: number
    y: number
    type: ParticleType
    scale: number
    rotation: number
}

interface ChickParticlesProps {
    trigger: number // Increment to trigger burst
    x?: number
    y?: number
}

export function ChickParticles({ trigger, x = 0, y = 0 }: ChickParticlesProps) {
    const [particles, setParticles] = useState<Particle[]>([])

    useEffect(() => {
        if (trigger === 0) return

        const newParticles: Particle[] = Array.from({ length: 6 }).map((_, i) => ({
            id: Date.now() + i,
            x: (Math.random() - 0.5) * 60, // Spread X
            y: (Math.random() - 1) * 60 - 20, // Spread Y (mostly up)
            type: Math.random() > 0.5 ? 'heart' : 'star',
            scale: 0.5 + Math.random() * 0.5,
            rotation: Math.random() * 360
        }))

        setParticles(prev => [...prev, ...newParticles])

        // Cleanup
        const timer = setTimeout(() => {
            setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)))
        }, 1000)

        return () => clearTimeout(timer)
    }, [trigger])

    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 100 }}>
            <AnimatePresence>
                {particles.map(particle => (
                    <motion.div
                        key={particle.id}
                        initial={{
                            opacity: 1,
                            x: 0,
                            y: 0,
                            scale: 0,
                            rotate: 0
                        }}
                        animate={{
                            opacity: 0,
                            x: particle.x,
                            y: particle.y,
                            scale: particle.scale,
                            rotate: particle.rotation
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                        {particle.type === 'heart' ? '❤️' : '⭐'}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
