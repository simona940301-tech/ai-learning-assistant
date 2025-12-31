'use client'

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface ConceptData {
  concept: string
  mastery: number
  fullMark: number
}

interface ConceptMasteryRadarProps {
  data: ConceptData[]
  title?: string
}

export default function ConceptMasteryRadar({ data, title = '概念掌握雷達圖' }: ConceptMasteryRadarProps) {
  return (
    <div className="w-full bg-card rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-foreground">{title}</h3>

      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={data}>
          <PolarGrid className="stroke-muted" />
          <PolarAngleAxis
            dataKey="concept"
            className="text-xs text-muted-foreground"
            tick={{ fill: 'currentColor', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            className="text-xs text-muted-foreground"
          />
          <Radar
            name="掌握度"
            dataKey="mastery"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="mt-4">
        <p className="text-sm text-muted-foreground text-center">
          外圍代表完全掌握 (100%)，中心代表尚未掌握 (0%)
        </p>
      </div>
    </div>
  )
}
