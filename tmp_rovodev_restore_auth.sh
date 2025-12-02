#!/bin/bash
echo "🔄 恢復原始認證文件..."
cp apps/web/lib/auth-context.tsx.backup apps/web/lib/auth-context.tsx
cp apps/web/app/onboarding/page.tsx.backup apps/web/app/onboarding/page.tsx
rm -f tmp_rovodev_*
echo "✅ 原始文件已恢復，測試文件已清理"
