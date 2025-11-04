#!/usr/bin/env node

/**
 * 部署前驗證腳本
 * 確保所有必要的依賴和配置都正確
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

function checkPackageJson() {
  console.log('🔍 檢查 package.json...')
  const webPackagePath = join(rootDir, 'apps/web/package.json')
  
  if (!existsSync(webPackagePath)) {
    console.error('❌ apps/web/package.json 不存在')
    process.exit(1)
  }

  const pkg = JSON.parse(readFileSync(webPackagePath, 'utf-8'))
  
  // 檢查 zod 是否存在
  if (!pkg.dependencies?.zod) {
    console.error('❌ apps/web/package.json 缺少 zod 依賴')
    process.exit(1)
  }

  console.log(`✅ zod 版本: ${pkg.dependencies.zod}`)
  return true
}

function checkLockfile() {
  console.log('🔍 檢查 pnpm-lock.yaml...')
  const lockfilePath = join(rootDir, 'pnpm-lock.yaml')
  
  if (!existsSync(lockfilePath)) {
    console.error('❌ pnpm-lock.yaml 不存在')
    process.exit(1)
  }

  const lockfile = readFileSync(lockfilePath, 'utf-8')
  
  // 檢查 apps/web 的 zod 是否存在於 lockfile
  if (!lockfile.includes('apps/web:') || !lockfile.includes('zod:')) {
    console.warn('⚠️  pnpm-lock.yaml 可能沒有同步 apps/web 的 zod')
    console.log('   建議執行: pnpm install --filter web')
  } else {
    console.log('✅ pnpm-lock.yaml 包含 zod')
  }
  
  return true
}

function checkVercelConfig() {
  console.log('🔍 檢查 vercel.json...')
  const vercelPath = join(rootDir, 'vercel.json')
  
  if (!existsSync(vercelPath)) {
    console.error('❌ vercel.json 不存在')
    process.exit(1)
  }

  const config = JSON.parse(readFileSync(vercelPath, 'utf-8'))
  
  if (config.rootDirectory !== 'apps/web') {
    console.error('❌ vercel.json rootDirectory 必須是 "apps/web"')
    process.exit(1)
  }

  console.log('✅ vercel.json 配置正確')
  return true
}

function checkCriticalFiles() {
  console.log('🔍 檢查關鍵檔案...')
  
  const criticalFiles = [
    'apps/web/app/api/ai/route.ts',
    'apps/web/app/api/ai/route-solver/route.ts',
    'apps/web/app/api/ai/route-solver-stream/route.ts',
    'apps/web/app/(app)/backpack/page.tsx',
  ]

  let allExist = true
  for (const file of criticalFiles) {
    const path = join(rootDir, file)
    if (!existsSync(path)) {
      console.error(`❌ ${file} 不存在`)
      allExist = false
    }
  }

  if (allExist) {
    console.log('✅ 所有關鍵檔案都存在')
  } else {
    process.exit(1)
  }
  
  return true
}

// 執行所有檢查
async function main() {
  console.log('🚀 開始部署前驗證...\n')
  
  try {
    checkPackageJson()
    checkLockfile()
    checkVercelConfig()
    checkCriticalFiles()
    
    console.log('\n✅ 所有檢查通過！可以進行部署。')
  } catch (error) {
    console.error('\n❌ 驗證失敗:', error.message)
    process.exit(1)
  }
}

main()

