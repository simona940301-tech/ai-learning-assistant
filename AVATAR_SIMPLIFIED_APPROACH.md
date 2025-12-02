# 🎨 Avatar System - Simplified Photo-Only Approach

## 🎯 新策略

**100% 用戶生成，零預設頭像**

### 為什麼這樣更好？

1. **更個人化** - 每個頭像都是獨一無二的
2. **更簡潔** - 不需要維護 24 個預設頭像
3. **更真實** - 用戶的真實照片轉換為像素藝術
4. **更有投入感** - 用戶會更珍惜自己生成的頭像

---

## 🏗️ 簡化架構

```
┌─────────────────────────────────────────┐
│  Upload Photo (Required)                │
│  - 用戶上傳照片                          │
│  - 客戶端即時像素化預覽                   │
│  - 儲存到 Supabase Storage              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Server Enhancement (Optional)           │
│  - 使用正確的 API (非 Gemini)            │
│  - 背景處理，不阻塞用戶                   │
│  - 完成後自動更新                        │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Fallback (No Avatar Yet)               │
│  - 漂亮的漸變色圓圈                      │
│  - 顯示用戶名首字母                      │
│  - 引導用戶上傳照片                      │
└─────────────────────────────────────────┘
```

---

## 📐 新的 Onboarding 流程

### **Option A: 在 Onboarding 中（推薦）**
```
Welcome → Avatar Upload (Skippable) → Challenge → Info → Reward
```

**優點:**
- 建立個人連結
- 提高完成率
- 頭像立即在對戰中可見

**缺點:**
- 可能增加流程時間
- 需要相機/照片權限

### **Option B: 在 Onboarding 後**
```
Welcome → Challenge → Info → Reward → (Profile Setup)
```

**優點:**
- 更快完成 onboarding
- 不會嚇跑用戶

**缺點:**
- 對戰時沒有頭像（體驗差）
- 用戶可能永遠不設置

### **建議: Option A + 大大的跳過按鈕**

---

## 🎨 照片像素化方案

### **方案 1: 客戶端即時處理（推薦 MVP）**

```typescript
// apps/web/lib/avatar/pixelate-client.ts
export async function pixelateImage(
  file: File,
  options: {
    size?: number
    colors?: number
    style?: 'jrpg' | 'retro'
  } = {}
): Promise<Blob> {
  const { size = 64, colors = 16, style = 'jrpg' } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      // 1. 縮小到目標尺寸
      canvas.width = size
      canvas.height = size

      // 2. 關閉平滑 (重要!)
      ctx.imageSmoothingEnabled = false

      // 3. 繪製縮小的圖片
      ctx.drawImage(img, 0, 0, size, size)

      // 4. 獲取像素數據
      const imageData = ctx.getImageData(0, 0, size, size)

      // 5. 顏色量化（減少到指定色數）
      const quantized = quantizeColors(imageData, colors)

      // 6. 放回 canvas
      ctx.putImageData(quantized, 0, 0)

      // 7. 轉換為 Blob
      canvas.toBlob(resolve, 'image/png')
    }

    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function quantizeColors(imageData: ImageData, numColors: number): ImageData {
  // 使用 K-means 或色彩調色板演算法
  // 簡化版: 四捨五入到最接近的色階
  const data = imageData.data
  const step = Math.floor(256 / numColors)

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / step) * step       // R
    data[i + 1] = Math.round(data[i + 1] / step) * step // G
    data[i + 2] = Math.round(data[i + 2] / step) * step // B
    // data[i + 3] 保持 alpha 不變
  }

  return imageData
}
```

**優點:**
- 即時預覽（0.2秒內）
- 不需要伺服器資源
- 離線也能用

**缺點:**
- 品質不如專業 AI
- 需要更多客戶端代碼

---

### **方案 2: 伺服器端處理（更好品質）**

```typescript
// apps/web/app/api/avatar/pixelate/route.ts
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('photo') as File

  // 使用 Sharp 進行像素化
  const buffer = await file.arrayBuffer()

  const pixelated = await sharp(Buffer.from(buffer))
    .resize(64, 64, {
      kernel: 'nearest', // 重要: 使用最近鄰插值
      fit: 'cover'
    })
    .png({ palette: true, colors: 16 }) // 限制色彩數
    .toBuffer()

  // 上傳到 Supabase Storage
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(`${userId}/${timestamp}.png`, pixelated)

  return NextResponse.json({ avatarUrl: data.publicUrl })
}
```

---

### **方案 3: AI 增強（未來/進階）**

如果你真的想用 AI，應該使用：

1. **Replicate API** - Stable Diffusion LoRA 模型
2. **DALL-E 3** - OpenAI API
3. **Midjourney API** - 品質最好但貴

**不要用 Gemini** - 它只能分析圖片，不能生成圖片

---

## 🎭 優雅的 Fallback 設計

當用戶還沒有頭像時：

```typescript
// apps/web/components/avatar/AvatarFallback.tsx
export function AvatarFallback({ name, size = 'md' }: Props) {
  // 根據名字生成一致的顏色
  const color = getColorFromString(name)

  return (
    <div
      className="flex items-center justify-center rounded-2xl"
      style={{
        background: `linear-gradient(135deg, ${color}80, ${color}40)`,
        width: sizeMap[size],
        height: sizeMap[size]
      }}
    >
      <span className="text-white font-bold text-2xl">
        {name[0].toUpperCase()}
      </span>
    </div>
  )
}

function getColorFromString(str: string): string {
  // 一致的顏色生成（同樣的名字永遠同樣的顏色）
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  const hue = hash % 360
  return `hsl(${hue}, 70%, 60%)`
}
```

**效果:**
- 美觀的漸變色
- 每個用戶有獨特顏色
- 清楚顯示首字母
- 引導上傳頭像的提示

---

## 📊 修改後的檔案清單

### **保留的檔案**
```
apps/web/
├── lib/avatar/
│   └── pixelate-client.ts          ← 新增: 客戶端像素化
├── components/avatar/
│   ├── AvatarUploader.tsx          ← 新增: 照片上傳組件
│   └── AvatarFallback.tsx          ← 新增: 優雅的 fallback
└── app/api/avatar/
    ├── pixelate/route.ts           ← 新增: 伺服器像素化
    └── upload/route.ts             ← 修改: 簡化上傳邏輯
```

### **刪除的檔案**
```
❌ lib/avatar/presets.ts             (不需要預設)
❌ components/avatar/AvatarSelector.tsx (不需要選擇器)
❌ app/onboarding/avatar/page.tsx    (改用簡化版)
❌ app/api/profile/generate-avatar/  (Gemini 誤用)
```

### **簡化的資料庫**
```sql
-- 只需要這些欄位
ALTER TABLE profiles
  ADD COLUMN avatar_url TEXT,              -- 頭像 URL
  ADD COLUMN avatar_generated_at TIMESTAMPTZ; -- 生成時間

-- 不需要 avatar_preset, avatar_tier
```

---

## 🚀 實施步驟

### Phase 1: 客戶端像素化（1天）
1. 實作 `pixelate-client.ts`
2. 創建 `AvatarUploader` 組件
3. 更新 `upload-avatar` API
4. 測試上傳流程

### Phase 2: Onboarding 整合（半天）
1. 簡化 onboarding/avatar 頁面
2. 只顯示上傳界面
3. 大大的跳過按鈕
4. 成功後跳轉到 challenge

### Phase 3: Fallback 設計（半天）
1. 實作 `AvatarFallback` 組件
2. 更新 `AnimatedAvatar` 使用 fallback
3. 在 profile 頁面引導上傳

### Phase 4: 伺服器增強（選擇性）
1. 使用 Sharp 提升品質
2. 背景處理隊列
3. 完成後推送通知

---

## 🎯 預期結果

### **用戶體驗**
- ✅ 每個頭像都是獨特的
- ✅ 上傳後立即看到像素化效果
- ✅ 沒有頭像時顯示美觀的 fallback
- ✅ 可以隨時跳過（不強制）

### **技術優勢**
- ✅ 更少的代碼維護
- ✅ 不需要管理 24 個預設頭像
- ✅ 客戶端處理 = 零伺服器成本
- ✅ 擴展性強（未來可加 AI）

### **商業價值**
- ✅ 高個人化 → 更高投入度
- ✅ 獨特性 → 社交分享動機
- ✅ 可選性 → 不嚇跑新用戶

---

## 💡 下一步？

我可以幫你：

1. **實作客戶端像素化** - 創建 `pixelate-client.ts`
2. **簡化 AvatarUploader** - 只保留上傳功能
3. **美化 Fallback** - 設計漂亮的無頭像狀態
4. **修正 API** - 移除 Gemini，使用正確方案

你想先從哪個開始？
