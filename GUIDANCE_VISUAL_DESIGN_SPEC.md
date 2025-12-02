# 🎨 引導系統視覺設計規範 - 極簡暖色系

## 📐 設計原則

### **1. 極簡主義 (Minimalism)**
- ❌ **移除:** 複雜漸變、多層陰影、花俏動畫
- ✅ **保留:** 單層柔和發光、簡單淡入淡出、必要的微動效

### **2. 暖色系品牌色 (Warm Brand Colors)**
```css
/* 品牌色彩系統 */
--cream-bg: #FAF6E9;      /* 奶油背景 */
--warm-white: #FFFDF5;    /* 暖白色 */
--sunshine: #FED168;      /* 陽光黃 (主要強調色) */
--sage: #528555;          /* 鼠尾草綠 */
--earth: #5D4037;         /* 大地棕 (主要文字色) */
--warm-border: #E0D0B8;   /* 暖色邊框 */
--warm-text: #8B6F47;     /* 暖色次要文字 */
```

### **3. 柔和視覺 (Soft Visual)**
- 圓角使用 `rounded-2xl` (16px) 和 `rounded-3xl` (24px)
- 陰影使用柔和 `shadow-md` 和 `shadow-lg`
- 動畫時長 0.2-0.4s,緩動函數使用 `ease-out`

---

## 🎯 三個視覺層級

### **Level 1: 柔和暖光 (Warm Glow)**

#### **視覺效果**
- **單層徑向漸變:** 從中心的暖黃色 (#FED168, 25% opacity) 向外擴散至透明
- **柔和陰影:** 外部暖黃色光暈 + 內部微弱光暈
- **極簡動畫:** 3秒緩慢呼吸效果 (scale 1.0 → 1.02)
- **文字氣泡:** 圓形膠囊,暖黃背景,大地棕文字

#### **顏色規範**
```css
/* 暖光環 */
background: radial-gradient(
  circle,
  rgba(254, 209, 104, 0.25) 0%,    /* 中心暖黃 25% */
  rgba(254, 209, 104, 0.08) 50%,   /* 中圈暖黃 8% */
  transparent 100%                  /* 外圈透明 */
);

/* 光暈陰影 */
box-shadow:
  0 0 20px rgba(254, 209, 104, 0.3),      /* 外暈 */
  inset 0 0 20px rgba(254, 209, 104, 0.1); /* 內暈 */

/* 文字氣泡 */
background: #FED168;
color: #5D4037;
border: 1px solid rgba(93, 64, 55, 0.1);
```

#### **動畫規範**
```css
@keyframes gentlePulse {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.02);
  }
}

animation: gentlePulse 3s ease-in-out infinite;
```

#### **使用場景**
- ✅ T04 引導 (Onboarding 完成後)
- ✅ 首次功能發現
- ✅ 需要用戶注意但不打斷流程的提示

---

### **Level 2: 簡約氣泡 (Simple Bubble)**

#### **視覺效果**
- **暖白卡片:** #FFFDF5 背景,暖色邊框 #E0D0B8
- **圓角設計:** `rounded-2xl` (16px)
- **小尾巴:** 使用 CSS Triangle,與卡片同色
- **關閉按鈕:** 暖黃圓形按鈕,大地棕 X 圖示

#### **顏色規範**
```css
/* 氣泡主體 */
background: #FFFDF5;
border: 1.5px solid #E0D0B8;
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

/* 文字 */
color: #5D4037;
font-size: 0.875rem; /* 14px */
font-weight: 500;

/* 關閉按鈕 */
background: #FED168;
color: #5D4037;
transition: transform 0.2s;
hover: scale(1.1);
```

#### **小尾巴規範**
```css
/* Top Position */
bottom: -6px;
border-width: 6px 6px 0 6px;
border-color: #FFFDF5 transparent transparent transparent;

/* Bottom Position */
top: -6px;
border-width: 0 6px 6px 6px;
border-color: transparent transparent #FFFDF5 transparent;

/* Left Position */
right: -6px;
border-width: 6px 0 6px 6px;
border-color: transparent transparent transparent #FFFDF5;

/* Right Position */
left: -6px;
border-width: 6px 6px 6px 0;
border-color: transparent #FFFDF5 transparent transparent;
```

#### **使用場景**
- ✅ T01 引導 (探索停滯)
- ✅ T02 引導 (低效重複)
- ✅ T03 引導 (錯誤糾正,輕度)
- ✅ 功能提示和建議

---

### **Level 3: 極簡對話框 (Minimal Dialog)**

#### **視覺效果**
- **半透明背景:** 大地棕 25% opacity + 8px 高斯模糊
- **暖白卡片:** #FFFDF5 背景,2px 暖色邊框
- **圓角設計:** `rounded-3xl` (24px)
- **雙按鈕:** 次要按鈕淡暖色,主要按鈕暖黃色

#### **顏色規範**
```css
/* 背景遮罩 */
background: rgba(93, 64, 55, 0.25);
backdrop-filter: blur(8px);

/* 對話框主體 */
background: #FFFDF5;
border: 2px solid #E0D0B8;
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* 標題 */
color: #5D4037;
font-size: 1.125rem; /* 18px */
font-weight: 600;

/* 次要文字 */
color: #8B6F47;
font-size: 0.875rem; /* 14px */

/* 次要按鈕 */
background: #F8F5E8;
color: #8B6F47;
border: 1.5px solid #E0D0B8;

/* 主要按鈕 */
background: #FED168;
color: #5D4037;
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
hover: scale(1.05);
```

#### **使用場景**
- ✅ T03 引導 (錯誤糾正,重度)
- ✅ 重要操作確認
- ✅ 需要用戶明確選擇的情境

---

## 🎬 動畫規範

### **淡入動畫 (Fade In)**
```tsx
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.4, ease: 'easeOut' }}
```

### **放大淡入 (Scale + Fade)**
```tsx
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.2, ease: 'easeOut' }}
```

### **上移淡入 (Slide Up + Fade)**
```tsx
initial={{ opacity: 0, y: -8 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.3, duration: 0.3 }}
```

### **懸停效果 (Hover)**
```css
transition: transform 0.2s ease-out;
hover: transform scale(1.05);
```

---

## 📏 尺寸規範

### **間距 (Spacing)**
```css
/* Level 1 Halo */
padding: 6px;           /* 暖光環與目標元素間距 */
text-bubble-offset: -40px; /* 文字氣泡與暖光環間距 */

/* Level 2 Tooltip */
padding: 12px 16px;     /* 氣泡內邊距 */
offset: 16px;           /* 氣泡與目標元素間距 */
gap: 8px;               /* 文字與按鈕間距 */

/* Level 3 Modal */
padding: 24px;          /* 對話框內邊距 */
title-margin: 8px;      /* 標題與內容間距 */
button-gap: 12px;       /* 按鈕間距 */
```

### **圓角 (Border Radius)**
```css
/* Level 1 */
halo: 16px (rounded-2xl);
text-bubble: 9999px (rounded-full);

/* Level 2 */
bubble: 16px (rounded-2xl);

/* Level 3 */
modal: 24px (rounded-3xl);
button: 16px (rounded-2xl);
```

### **陰影 (Shadow)**
```css
/* Level 1 */
text-bubble: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

/* Level 2 */
bubble: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

/* Level 3 */
modal: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
button-primary: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
button-primary-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
```

---

## 🎨 視覺對比

### **舊設計 (藍紫漸變) ❌**
```css
/* 冷色系,過於花俏 */
background: linear-gradient(to-r, from-blue-400/40, via-purple-400/40, to-pink-400/40);
border: border-blue-200/50;
text: text-blue-900;
button: from-blue-500 to-purple-500;
```

### **新設計 (極簡暖色) ✅**
```css
/* 暖色系,極簡設計 */
background: radial-gradient(rgba(254, 209, 104, 0.25), transparent);
border: #E0D0B8;
text: #5D4037;
button: #FED168;
```

---

## 📱 響應式設計

### **移動端優化**
- 文字氣泡使用 `whitespace-nowrap` 防止換行
- Modal 使用 `max-w-sm` (384px) 確保不超出螢幕
- 按鈕高度 `py-3` (12px) 確保易點擊
- 所有互動元素最小尺寸 44x44px (iOS Human Interface Guidelines)

### **桌面端優化**
- Tooltip 自動計算位置,避免超出視窗
- Modal 居中顯示,背景模糊
- 懸停效果增強互動反饋

---

## ✅ 實作檢查清單

### **Level 1 (Warm Glow)**
- [x] 單層徑向漸變 (暖黃色)
- [x] 柔和外部光暈
- [x] 3秒呼吸動畫
- [x] 暖黃文字氣泡
- [x] 大地棕文字

### **Level 2 (Simple Bubble)**
- [x] 暖白背景 (#FFFDF5)
- [x] 暖色邊框 (#E0D0B8)
- [x] 極簡小尾巴
- [x] 暖黃關閉按鈕
- [x] 7秒自動消失

### **Level 3 (Minimal Dialog)**
- [x] 半透明暖色背景
- [x] 暖白卡片
- [x] 雙按鈕設計
- [x] 主按鈕暖黃色
- [x] 懸停放大效果

---

## 🎯 設計亮點

### **1. 品牌一致性**
- 所有顏色來自品牌色彩系統
- 視覺風格與 Onboarding 頁面一致
- 暖色系營造溫暖、友善的學習氛圍

### **2. 極簡美學**
- 移除不必要的視覺元素
- 單層效果取代多層疊加
- 柔和動畫取代劇烈變化

### **3. 可訪問性**
- 文字對比度符合 WCAG AA 標準
- 最小點擊區域 44x44px
- 鍵盤導航支持 (ESC 關閉)
- 屏幕閱讀器友好

### **4. 性能優化**
- 使用 CSS 動畫取代 JS 動畫
- 避免 Layout Thrashing
- GPU 加速 (transform, opacity)
- 最小化 DOM 操作

---

## 📊 A/B 測試建議

### **測試變體**

**變體 A: 當前設計 (極簡暖色)**
- 單層暖光環
- 暖白氣泡
- 暖黃按鈕

**變體 B: 更亮眼設計**
- 雙層暖光環 (內層更亮)
- 氣泡加入微弱陰影
- 按鈕加入微弱漸變

### **測量指標**
- 引導完成率 (用戶點擊率)
- 用戶停留時間
- 關閉率 vs 完成率
- NPS 分數變化

---

## 🔧 開發指南

### **顏色使用**
```tsx
// 使用 inline style 確保顏色一致
style={{
  background: '#FED168',
  color: '#5D4037',
  border: '1.5px solid #E0D0B8',
}}
```

### **動畫使用**
```tsx
// 使用 Framer Motion
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.4, ease: 'easeOut' }}
>
```

### **CSS Animation**
```tsx
// 使用 styled-jsx 定義 keyframes
<style jsx>{`
  @keyframes gentlePulse {
    0%, 100% { opacity: 0.8; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.02); }
  }
`}</style>
```

---

**設計規範版本:** v2.0 (極簡暖色系)
**最後更新:** 2025-11-28
**設計師:** Claude (Sonnet 4.5)
**適用組件:** `GuidanceTooltip.tsx`
