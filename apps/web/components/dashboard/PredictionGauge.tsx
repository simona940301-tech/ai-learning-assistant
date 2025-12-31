'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts'

interface PredictionGaugeProps {
  currentScore: number
  predictedScore: number
  targetScore: number
  daysRemaining: number
}

export default function PredictionGauge({
  currentScore,
  predictedScore,
  targetScore,
  daysRemaining
}: PredictionGaugeProps) {
  // Calculate gauge data
  const gaugeData = [
    { name: 'Progress', value: predictedScore },
    { name: 'Remaining', value: 100 - predictedScore }
  ]

  const COLORS = ['#3b82f6', '#e5e7eb']

  // Determine color based on prediction vs target
  const getStatusColor = () => {
    if (predictedScore >= targetScore) return 'text-green-600'
    if (predictedScore >= targetScore - 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusText = () => {
    if (predictedScore >= targetScore) return '目標可達成！'
    if (predictedScore >= targetScore - 5) return '接近目標'
    return '需要加強'
  }

  return (
    <div className="w-full bg-card rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        成績預測儀表板
      </h3>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Gauge Chart */}
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={0}
                innerRadius={80}
                outerRadius={120}
                dataKey="value"
                stroke="none"
              >
                {gaugeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
                <Label
                  value={`${predictedScore}分`}
                  position="center"
                  className="text-3xl font-bold"
                  fill="#111827"
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="text-center -mt-2">
            <p className={`text-xl font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 w-full space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground">目前程度</div>
            <div className="text-2xl font-bold text-blue-600">
              {currentScore}分
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground">
              預測 {daysRemaining} 天後
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {predictedScore}分
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground">目標分數</div>
            <div className="text-2xl font-bold text-green-600">
              {targetScore}分
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>達成率</span>
              <span>{Math.round((predictedScore / targetScore) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (predictedScore / targetScore) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
