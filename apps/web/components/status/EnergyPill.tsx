'use client'

import Image from 'next/image'
import { useEnergyStatus } from '@/lib/hooks/useEnergyStatus'

/**
 * EnergyPill - 羽毛 + 數字 + 倒數同一膠囊，中心細分隔線
 */
export function EnergyPill() {
  const { energy, maxEnergy, formattedTime } = useEnergyStatus()

  const showTimer = energy < maxEnergy
  const timerText = formattedTime && formattedTime !== 'FULL' ? formattedTime : '--:--'
  const timerColor = '#8B6E57'

  return (
    <div className="flex items-center justify-end">
      <div
        className="relative inline-flex items-center"
        style={{
          paddingLeft: '14px',
          paddingRight: '14px',
          paddingTop: '4px',
          paddingBottom: '4px',
          height: '38px',
          borderRadius: '999px',
          background: 'linear-gradient(180deg, rgba(247,238,227,0.22), rgba(231,210,184,0.18))',
          boxShadow: 'inset 0 0 0 0.6px rgba(107,74,54,0.16)',
          gap: '12px',
        }}
      >
        <div className="relative flex items-center" style={{ gap: '6px' }}>
          <div className="relative" style={{ width: '50px', height: '50px' }}>
            <Image
              src="/featherpoint.png"
              alt="羽毛"
              fill
              sizes="50px"
              style={{
                objectFit: 'contain',
              }}
            />
          </div>
          <span
            className="font-bold tabular-nums"
            style={{
              color: '#6B4A36',
              lineHeight: 1.15,
              fontSize: '16px',
            }}
          >
            {energy}
          </span>
        </div>

        {showTimer && (
          <>
            <div
              aria-hidden
              style={{
                width: '1px',
                height: '70%',
                background: '#D8C7B3',
                opacity: 0.7,
              }}
            />
            <span
              className="tabular-nums"
              style={{
                color: timerColor,
                fontSize: '10.5px',
                fontWeight: 500,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              }}
            >
              {timerText}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
