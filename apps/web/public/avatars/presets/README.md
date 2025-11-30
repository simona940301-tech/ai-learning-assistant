# 🎨 預設頭像圖片說明

這個資料夾存放玩家可以選擇的預設頭像圖片。

## 📁 資料夾結構

```
presets/
├── student/     # 學生系列頭像
├── hero/        # 英雄系列頭像
├── scholar/     # 學者系列頭像
└── fantasy/     # 奇幻系列頭像
```

## 🎯 圖片規範

- **格式**: PNG 或 WebP (推薦 WebP 以獲得更好的壓縮)
- **尺寸**: 256x256 pixels (正方形)
- **背景**: 透明背景
- **風格**: 卡通風格，適合學習主題
- **命名**: 使用對應的 preset id，例如 `student-01.webp`

## 📋 需要創建的頭像列表

### 學生系列 (student)
- `student-01.webp` - 勤學少年 👨‍🎓
- `student-02.webp` - 聰慧少女 👩‍🎓
- `student-03.webp` - 運動健將 🏃
- `student-04.webp` - 創意達人 🎨
- `student-05.webp` - 科學狂 🔬
- `student-06.webp` - 書蟲 📚

### 英雄系列 (hero)
- `hero-01.webp` - 學霸戰士 ⚔️
- `hero-02.webp` - 智慧法師 🔮
- `hero-03.webp` - 速算弓手 🏹
- `hero-04.webp` - 防禦坦克 🛡️
- `hero-05.webp` - 閃電刺客 ⚡
- `hero-06.webp` - 聖光治療 ✨

### 學者系列 (scholar)
- `scholar-01.webp` - 古典學者 📜
- `scholar-02.webp` - 數學大師 📐
- `scholar-03.webp` - 文學詩人 🖋️
- `scholar-04.webp` - 地理探險家 🗺️
- `scholar-05.webp` - 化學煉金士 ⚗️
- `scholar-06.webp` - 物理工程師 ⚙️

### 奇幻系列 (fantasy)
- `fantasy-01.webp` - 星空使者 🌟
- `fantasy-02.webp` - 龍族學徒 🐉
- `fantasy-03.webp` - 精靈導師 🧝
- `fantasy-04.webp` - 貓咪學者 🐱
- `fantasy-05.webp` - 機器學霸 🤖
- `fantasy-06.webp` - 火焰鳳凰 🔥

## 🎨 設計建議

- 使用可愛的卡通風格
- 顏色要鮮豔明亮
- 保持一致的繪畫風格
- 加入學習相關的元素（書本、計算機等）
- 確保在不同大小下都能清晰顯示

## 📝 使用方式

這些圖片會在以下場景中使用：
1. **Profile頁面**: 用戶可以選擇預設頭像
2. **Onboarding流程**: 新用戶註冊時選擇頭像
3. **對戰界面**: 顯示用戶的頭像

## 🔧 開發說明

圖片路徑會自動生成，格式為 `/avatars/presets/{category}/{id}.webp`

例如：`/avatars/presets/student/student-01.webp`
