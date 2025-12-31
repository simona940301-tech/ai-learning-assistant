'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

/**
 * 🎮 對戰特效系統
 * 
 * 方案B：平衡質感
 * - 答對特效：avatar放大+旋轉+金色光環+星星粒子
 * - 答錯特效：avatar縮小+搖晃+紅色陰影+煙霧效果
 * - 連擊特效：連續答對時火焰圍繞avatar
 */

export type BattleEffectType = 'hit' | 'miss' | 'combo' | null

interface BattleEffectsProps {
  /** 玩家特效類型 */
  playerEffect: BattleEffectType
  /** 對手特效類型 */
  opponentEffect: BattleEffectType
  /** 玩家連擊數 */
  playerCombo?: number
  /** 對手連擊數 */
  opponentCombo?: number
}

export function BattleEffects({
  playerEffect,
  opponentEffect,
  playerCombo = 0,
  opponentCombo = 0,
}: BattleEffectsProps) {
  return (
    <>
      {/* 全屏背景特效 */}
      <FullScreenEffect playerEffect={playerEffect} opponentEffect={opponentEffect} />
      
      {/* 玩家特效 */}
      <PlayerEffect effect={playerEffect} combo={playerCombo} side="left" />
      
      {/* 對手特效 */}
      <PlayerEffect effect={opponentEffect} combo={opponentCombo} side="right" />
    </>
  )
}

/**
 * 全屏背景特效
 */
function FullScreenEffect({ 
  playerEffect, 
  opponentEffect 
}: { 
  playerEffect: BattleEffectType
  opponentEffect: BattleEffectType 
}) {
  const [activeEffect, setActiveEffect] = useState<'hit' | 'miss' | null>(null)

  useEffect(() => {
    if (playerEffect === 'hit') {
      setActiveEffect('hit')
      const timer = setTimeout(() => setActiveEffect(null), 600)
      return () => clearTimeout(timer)
    } else if (playerEffect === 'miss') {
      setActiveEffect('miss')
      const timer = setTimeout(() => setActiveEffect(null), 600)
      return () => clearTimeout(timer)
    }
  }, [playerEffect])

  return (
    <AnimatePresence>
      {activeEffect === 'hit' && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-30"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0, 0.3, 0],
            background: [
              'radial-gradient(circle at center, rgba(255, 215, 0, 0) 0%, transparent 50%)',
              'radial-gradient(circle at center, rgba(255, 215, 0, 0.3) 30%, transparent 70%)',
              'radial-gradient(circle at center, rgba(255, 215, 0, 0) 0%, transparent 50%)',
            ]
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      )}
      
      {activeEffect === 'miss' && (
        <>
          {/* 紅色閃光 */}
          <motion.div
            className="pointer-events-none fixed inset-0 z-30 bg-red-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
          
          {/* 螢幕晃動 */}
          <motion.div
            className="pointer-events-none fixed inset-0 z-30"
            animate={{ 
              x: [0, -5, 5, -3, 3, 0],
              y: [0, 3, -3, 2, -2, 0]
            }}
            transition={{ duration: 0.4 }}
          />
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * 玩家/對手特效（從avatar位置發出）
 */
function PlayerEffect({ 
  effect, 
  combo, 
  side 
}: { 
  effect: BattleEffectType
  combo: number
  side: 'left' | 'right'
}) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])
  const isLeft = side === 'left'

  useEffect(() => {
    if (effect === 'hit') {
      // 答對時生成星星粒子
      const newParticles = Array.from({ length: 12 }).map((_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100,
        delay: i * 0.03,
      }))
      setParticles(newParticles)

      const timer = setTimeout(() => setParticles([]), 1200)
      return () => clearTimeout(timer)
    } else if (effect === 'miss') {
      // 答錯時生成煙霧粒子
      const newParticles = Array.from({ length: 8 }).map((_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 60,
        y: -Math.random() * 80 - 20,
        delay: i * 0.05,
      }))
      setParticles(newParticles)

      const timer = setTimeout(() => setParticles([]), 1000)
      return () => clearTimeout(timer)
    }
  }, [effect])

  // 計算avatar位置（header左右兩側）
  const positionClass = isLeft 
    ? 'left-[60px] top-[32px]' 
    : 'right-[60px] top-[32px]'

  return (
    <>
      {/* 粒子效果 */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className={`pointer-events-none fixed ${positionClass} z-40`}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: particle.x,
              y: particle.y,
              scale: effect === 'hit' ? [0, 1.5, 0] : [1, 1.2, 0],
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: effect === 'hit' ? 1.2 : 0.8, 
              ease: 'easeOut',
              delay: particle.delay,
            }}
          >
            {effect === 'hit' ? (
              // 金色星星
              <div className="relative">
                <div className="absolute h-3 w-3 rotate-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 blur-sm rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center text-yellow-300 text-lg">⭐</div>
                </div>
              </div>
            ) : (
              // 灰色煙霧
              <div
                className="h-4 w-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 opacity-60"
                style={{
                  filter: 'blur(4px)',
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 連擊火焰光環 */}
      <AnimatePresence>
        {combo >= 3 && (
          <motion.div
            className={`pointer-events-none fixed ${positionClass} z-35`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0.8, 1.2, 1],
              opacity: [0, 1, 0.8],
              rotate: [0, 360],
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              scale: { duration: 0.6, ease: 'easeOut' },
              rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
            }}
          >
            {/* 火焰光環 */}
            <div className="relative h-24 w-24 -translate-x-1/2 -translate-y-1/2">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255, 165, 0, 0.6) 0%, rgba(255, 69, 0, 0.4) 50%, transparent 70%)',
                  filter: 'blur(8px)',
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.6, 0.8, 0.6],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              
              {/* 火焰粒子 */}
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-2 w-2 rounded-full bg-orange-400"
                  style={{
                    left: '50%',
                    top: '50%',
                    marginLeft: '-4px',
                    marginTop: '-4px',
                  }}
                  animate={{
                    x: [0, Math.cos((i * 60 * Math.PI) / 180) * 40],
                    y: [0, Math.sin((i * 60 * Math.PI) / 180) * 40],
                    opacity: [1, 0],
                    scale: [1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 連擊文字提示 */}
      <AnimatePresence>
        {combo >= 5 && effect === 'hit' && (
          <motion.div
            className={`pointer-events-none fixed z-40 ${isLeft ? 'left-[120px]' : 'right-[120px]'} top-[20px]`}
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative">
              <div className="absolute inset-0 blur-md bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
              <div className="relative px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full border-2 border-yellow-300 shadow-lg">
                <span className="text-sm font-black text-white tracking-wider">
                  {combo}x COMBO!
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

