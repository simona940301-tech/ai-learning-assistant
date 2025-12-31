#!/bin/bash

# 需要更新的 API routes 列表
FILES=(
  "apps/web/app/api/metrics/route.ts"
  "apps/web/app/api/missions/similar-question/route.ts"
  "apps/web/app/api/missions/answer/route.ts"
  "apps/web/app/api/missions/complete/route.ts"
  "apps/web/app/api/missions/start/route.ts"
  "apps/web/app/api/missions/route.ts"
  "apps/web/app/api/packs/install/route.ts"
  "apps/web/app/api/packs/installed/route.ts"
  "apps/web/app/api/packs/uninstall/route.ts"
  "apps/web/app/api/packs/route.ts"
  "apps/web/app/api/packs/[id]/route.ts"
  "apps/web/app/api/qr/[alias]/route.ts"
  "apps/web/app/api/play/battle/events/route.ts"
  "apps/web/app/api/play/user/consume-energy/route.ts"
  "apps/web/app/api/play/user/status/route.ts"
  "apps/web/app/api/play/knowledge/generate-note/route.ts"
)

echo "Files that need to be updated:"
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (not found)"
  fi
done

