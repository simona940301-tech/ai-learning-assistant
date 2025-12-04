# ⚡ 快速整合指南 - Chick 行為引擎 + 心理學鉤子

**目的**: 快速將新組件整合至現有頁面，無需修改核心邏輯

---

## 🚀 3 分鐘快速整合

### Step 1: 替換 Chick Widget（全局）

```tsx
// ❌ 移除舊的 import（如果有的話）
// import { TamagotchiWidget } from '@/components/companion/tamagotchi-widget'

// ✅ 使用新的 ChickFloatingWidget
import { ChickFloatingWidget } from '@/components/companion/chick-floating-widget'

// 在 Layout 或主要頁面中使用
<ChickFloatingWidget />
```

**位置**: `apps/web/app/(app)/layout.tsx` 或各個頁面的底部

---

### Step 2: Home 頁面 - 添加錯題提醒

```tsx
// apps/web/app/(app)/home/page.tsx

import { LossAversionCard } from '@/components/home/LossAversionCard'

export default function HomePage() {
  // TODO: 從 API 或狀態管理取得數據
  // 暫時使用假數據進行測試
  const wrongQuestionsCount = 12
  const daysUntilExpiry = 2

  return (
    <main className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-6">
      {/* ✅ 新增：損失厭惡卡片 */}
      <LossAversionCard
        wrongQuestionsCount={wrongQuestionsCount}
        daysUntilExpiry={daysUntilExpiry}
      />

      {/* 現有內容 */}
      <DailySnapshot />
      <NextActionCard />
    </main>
  )
}
```

---

### Step 3: Profile 頁面 - 添加排名與徽章

```tsx
// apps/web/app/(app)/profile/page.tsx

import { SocialProofCard } from '@/components/profile/SocialProofCard'
import { EndowmentProgressCard } from '@/components/profile/EndowmentProgressCard'

export default function ProfilePage() {
  // TODO: 從 API 取得數據
  // 暫時使用假數據
  const currentLevel = 25
  const percentile = 75

  const badges = [
    {
      id: '1',
      name: '新手戰士',
      description: '完成首次對戰',
      icon: '🏅',
      isUnlocked: true,
    },
    {
      id: '2',
      name: '連勝王',
      description: '連贏 5 場',
      icon: '👑',
      isUnlocked: true,
    },
    {
      id: '3',
      name: '百戰老兵',
      description: '完成 100 場對戰',
      icon: '⚔️',
      isUnlocked: false,
      progress: 70,
      requirement: '再完成 30 場對戰即可解鎖！'
    },
  ]

  return (
    <main className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-6">
      {/* ✅ 新增：社群證明卡片 */}
      <SocialProofCard
        currentLevel={currentLevel}
        percentile={percentile}
        totalUsers={10000}
      />

      {/* ✅ 新增：稟賦效應卡片 */}
      <EndowmentProgressCard
        title="我的徽章"
        items={badges}
        nextItem={badges.find(b => !b.isUnlocked && b.progress && b.progress > 50)}
        variant="badges"
      />

      {/* 現有內容 */}
      <DreamSchoolProgressCard />
    </main>
  )
}
```

---

### Step 4: Store 頁面 - 添加限時倒數

```tsx
// apps/web/app/(app)/store-shop/page.tsx

import { ScarcityBadge } from '@/components/store/ScarcityBadge'

export default function StorePage() {
  // TODO: 從 API 取得商品數據
  // 暫時使用假數據
  const limitedProduct = {
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 小時後過期
    remainingStock: 5,
  }

  return (
    <main className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-6">
      {/* 商品卡片 */}
      <div className="relative">
        {/* ✅ 新增：稀缺性 Badge（顯示在角落） */}
        <ScarcityBadge
          expiresAt={limitedProduct.expiresAt}
          type="limited-stock"
          remainingStock={limitedProduct.remainingStock}
          variant="badge"
        />

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">限時題本</h3>
          <p className="text-sm text-muted-foreground mb-4">
            精選歷屆試題，限時特惠！
          </p>

          {/* ✅ 新增：稀缺性 Banner（顯示在內部） */}
          <ScarcityBadge
            expiresAt={limitedProduct.expiresAt}
            type="limited-time"
            variant="banner"
          />

          <Button className="w-full mt-4">立即購買</Button>
        </Card>
      </div>
    </main>
  )
}
```

---

## 📡 API 整合（第二階段）

當假數據測試完成後，替換為真實 API：

### 1. Home 頁面 - 錯題數據

```tsx
// 建議使用 useQuery 或 Server Component
async function getWrongQuestions() {
  const res = await fetch('/api/mistakes/summary')
  return res.json()
}

// 在組件中使用
const { count, daysUntilExpiry } = await getWrongQuestions()

<LossAversionCard
  wrongQuestionsCount={count}
  daysUntilExpiry={daysUntilExpiry}
/>
```

**API 端點**:
```ts
// apps/web/app/api/mistakes/summary/route.ts
export async function GET(req: Request) {
  const userId = getUserId() // 從 session 取得

  // 計算錯題數量與過期天數
  const mistakes = await db.query(`
    SELECT COUNT(*) as count,
           MIN(7 - EXTRACT(DAY FROM (NOW() - created_at))) as days_until_expiry
    FROM user_mistakes
    WHERE user_id = $1 AND reviewed = false
  `, [userId])

  return Response.json({
    count: mistakes.rows[0].count,
    daysUntilExpiry: Math.max(0, mistakes.rows[0].days_until_expiry || 7)
  })
}
```

---

### 2. Profile 頁面 - 排名數據

```tsx
async function getUserRank() {
  const res = await fetch('/api/profile/rank')
  return res.json()
}

const { percentile, rank, totalUsers } = await getUserRank()

<SocialProofCard
  currentLevel={currentLevel}
  percentile={percentile}
  totalUsers={totalUsers}
/>
```

**API 端點**:
```ts
// apps/web/app/api/profile/rank/route.ts
export async function GET(req: Request) {
  const userId = getUserId()

  // 計算百分位
  const userLevel = await db.query(
    'SELECT level FROM users WHERE id = $1',
    [userId]
  )

  const totalUsers = await db.query('SELECT COUNT(*) FROM users')

  const usersBelow = await db.query(
    'SELECT COUNT(*) FROM users WHERE level < $1',
    [userLevel.rows[0].level]
  )

  const percentile = Math.round(
    (usersBelow.rows[0].count / totalUsers.rows[0].count) * 100
  )

  return Response.json({
    percentile,
    rank: totalUsers.rows[0].count - usersBelow.rows[0].count,
    totalUsers: totalUsers.rows[0].count
  })
}
```

---

### 3. Profile 頁面 - 徽章進度

```tsx
async function getBadges() {
  const res = await fetch('/api/badges/progress')
  return res.json()
}

const badges = await getBadges()

<EndowmentProgressCard
  title="我的徽章"
  items={badges}
  nextItem={badges.find(b => !b.isUnlocked && b.progress && b.progress > 50)}
/>
```

**API 端點**:
```ts
// apps/web/app/api/badges/progress/route.ts
import { AchievementItem } from '@/components/profile/EndowmentProgressCard'

export async function GET(req: Request) {
  const userId = getUserId()

  // 從資料庫取得徽章狀態
  const userBadges = await db.query(`
    SELECT badge_id, unlocked_at, progress
    FROM user_badges
    WHERE user_id = $1
  `, [userId])

  const badgeDefinitions = [
    { id: 'rookie', name: '新手戰士', description: '完成首次對戰', icon: '🏅', requirement: '完成 1 場對戰' },
    { id: 'warrior', name: '百戰老兵', description: '完成 100 場對戰', icon: '⚔️', requirement: '完成 100 場對戰' },
    // ... 更多徽章定義
  ]

  const badges: AchievementItem[] = badgeDefinitions.map(def => {
    const userBadge = userBadges.rows.find(ub => ub.badge_id === def.id)
    return {
      ...def,
      isUnlocked: !!userBadge?.unlocked_at,
      progress: userBadge?.progress || 0,
    }
  })

  return Response.json(badges)
}
```

---

### 4. Store 頁面 - 商品限時數據

```tsx
async function getStoreItems() {
  const res = await fetch('/api/store/items')
  return res.json()
}

const items = await getStoreItems()

{items.map(item => (
  <div key={item.id} className="relative">
    <ScarcityBadge
      expiresAt={item.expiresAt}
      type={item.type}
      remainingStock={item.remainingStock}
      variant="badge"
    />
    {/* 商品內容 */}
  </div>
))}
```

**API 端點**:
```ts
// apps/web/app/api/store/items/route.ts
export async function GET(req: Request) {
  const items = await db.query(`
    SELECT id, name, expires_at, remaining_stock, type
    FROM store_items
    WHERE expires_at > NOW() OR remaining_stock > 0
    ORDER BY expires_at ASC
  `)

  return Response.json(
    items.rows.map(item => ({
      id: item.id,
      name: item.name,
      expiresAt: item.expires_at,
      remainingStock: item.remaining_stock,
      type: item.type || 'limited-time'
    }))
  )
}
```

---

## ✅ 測試 Checklist

### 視覺測試
- [ ] 所有新組件在手機端 (375px) 正常顯示
- [ ] 所有新組件在平板端 (768px) 正常顯示
- [ ] 顏色主題符合設計系統 (Phase 1)
- [ ] 圓角、間距、陰影統一

### 功能測試
- [ ] ChickWidget 滾動時縮小至 40px
- [ ] ChickWidget 不遮擋 TabBar
- [ ] Loss Aversion 卡片點擊跳轉正確
- [ ] Social Proof 進度條動畫播放
- [ ] Scarcity Badge 倒數計時正確更新
- [ ] Endowment 徽章 hover 放大效果

### 效能測試
- [ ] 倒數計時不造成過多 re-render
- [ ] 滾動監聽不影響頁面流暢度
- [ ] 動畫不造成 Layout Shift

---

## 🐛 常見問題

### Q1: ChickWidget 遮擋了 TabBar？

**A**: 檢查 CSS 變數是否正確定義：

```css
/* apps/web/app/globals.css */
--tab-bar-height: 64px;
```

確保 Widget 的 `bottom` 計算正確：
```tsx
bottom: isScrolled
  ? 'calc(var(--tab-bar-height, 64px) + 0.75rem)'
  : 'calc(var(--tab-bar-height, 64px) + 1.5rem)'
```

---

### Q2: 倒數計時不更新？

**A**: 檢查 `useCountdown` hook 是否正確運行：

```tsx
// 確保傳入的是 Date 對象
const targetDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt

// 檢查 useEffect 依賴
useEffect(() => {
  calculateTimeLeft()
  const interval = setInterval(calculateTimeLeft, 1000)
  return () => clearInterval(interval)
}, [targetDate]) // ✅ 確保依賴正確
```

---

### Q3: 進度條動畫不播放？

**A**: 檢查 framer-motion 是否正確安裝：

```bash
pnpm install framer-motion
```

確保 `initial` 和 `animate` props 正確：
```tsx
<motion.div
  initial={{ width: 0 }}
  animate={{ width: `${percentile}%` }}
  transition={{ duration: 1, delay: 0.3 }}
/>
```

---

## 🎉 完成！

所有組件已整合完成。建議順序：

1. ✅ 先使用假數據測試視覺效果
2. ✅ 確認所有組件正常顯示
3. ✅ 逐步替換為真實 API
4. ✅ 進行 A/B Testing 驗證效果

**下一步**: 根據用戶數據調整提示文案與觸發條件，持續優化轉換率！
