'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ProficiencyData {
  date: string
  proficiency: number
  accuracy: number
}

interface ProficiencyChartProps {
  data: ProficiencyData[]
  title?: string
}

export default function ProficiencyChart({ data, title = '學習進度追蹤' }: ProficiencyChartProps) {
  return (
    <div className="w-full bg-card rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-foreground">{title}</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            className="text-sm text-muted-foreground"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            domain={[0, 100]}
            className="text-sm text-muted-foreground"
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            labelStyle={{ color: '#111827', fontWeight: 600 }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="proficiency"
            stroke="#3b82f6"
            strokeWidth={2}
            name="總體熟練度"
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="#10b981"
            strokeWidth={2}
            name="正確率"
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-sm text-muted-foreground">熟練度趨勢</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-sm text-muted-foreground">正確率趨勢</span>
        </div>
      </div>
    </div>
  )
}
