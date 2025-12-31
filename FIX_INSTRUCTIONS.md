# macOS文件系統I/O超時修復說明

## 根本原因
**OS錯誤60: Operation timed out** - macOS操作系統層級的文件讀取超時

### 診斷結果:
1. ✅ 磁盤空間不足: 97%已使用(僅剩16GB)
2. ✅ 文件系統I/O阻塞: 所有讀取操作超時
3. ✅ 項目路徑包含空格: "/Users/simonac/Desktop/moonshot idea"
4. ✅ 擴展屬性(xattr)可能干擾文件訪問

## 立即修復步驟:

### 方案1: 清理磁盤空間(推薦)
```bash
# 1. 清理系統緩存
sudo purge

# 2. 清理npm/pnpm緩存
pnpm store prune
npm cache clean --force

# 3. 清理Time Machine本地快照
tmutil listlocalsnapshots /
tmutil deletelocalsnapshots [日期]

# 4. 清理Xcode緩存
rm -rf ~/Library/Developer/Xcode/DerivedData/*
rm -rf ~/Library/Caches/com.apple.dt.Xcode

# 5. 清理Docker(如果有)
docker system prune -a
```

### 方案2: 重命名項目目錄(快速)
```bash
cd ~/Desktop
mv "moonshot idea" moonshot-idea
cd moonshot-idea/apps/web
pnpm dev
```

### 方案3: 禁用Turbopack(臨時解決)
```bash
cd "/Users/simonac/Desktop/moonshot idea/apps/web"
# 編輯package.json的dev script
# 從: "next dev"
# 改為: "next dev --no-turbopack"

pnpm dev
```

### 方案4: 使用網絡路徑workaround
```bash
# 創建符號鏈接到沒有空格的路徑
ln -s "/Users/simonac/Desktop/moonshot idea" ~/moonshot-idea
cd ~/moonshot-idea/apps/web
pnpm dev
```

## 我已經做的修復:
1. ✅ 創建了新的`.env.local`文件(舊文件無法讀取)
2. ✅ 更新了`next.config.js`,添加了緩存配置減少I/O
3. ✅ 清除了文件的擴展屬性(xattr)
4. ✅ 清理了.next和.turbo緩存

## 下一步操作:
請手動執行以下任一方案:
- **最快**: 重命名目錄移除空格(方案2)
- **最徹底**: 清理磁盤空間到至少50GB可用(方案1)
- **臨時**: 禁用Turbopack(方案3)

## 驗證修復:
```bash
cd apps/web
pnpm dev
# 打開 http://localhost:3000/preview
```

---
生成時間: $(date)
