#!/usr/bin/env tsx

/**
 * SEO Metadata Verification Script
 *
 * Validates that all SEO metadata is properly configured for App Store optimization.
 * This script checks metadata completeness, PWA configuration, and best practices.
 */

import fs from 'fs'
import path from 'path'

interface MetadataCheck {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: string
}

class SEOVerifier {
  private checks: MetadataCheck[] = []
  private webDir = path.join(process.cwd(), 'apps/web')

  async runVerification(): Promise<void> {
    console.log('🔍 開始 SEO Metadata 驗證...\n')

    // Basic metadata checks
    await this.checkManifestJson()
    await this.checkOgImage()
    await this.checkPwaIcons()
    await this.checkMetadataConfig()

    // Display results
    this.displayResults()

    // Exit with appropriate code
    const hasFailures = this.checks.some(check => check.status === 'fail')
    process.exit(hasFailures ? 1 : 0)
  }

  private async checkManifestJson(): Promise<void> {
    const manifestPath = path.join(this.webDir, 'public/manifest.json')

    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
      const manifest = JSON.parse(manifestContent)

      // Required fields
      const requiredFields = [
        'name', 'short_name', 'description', 'start_url',
        'display', 'background_color', 'theme_color', 'icons'
      ]

      for (const field of requiredFields) {
        if (!manifest[field]) {
          this.checks.push({
            name: 'PWA Manifest - 必要欄位',
            status: 'fail',
            message: `缺少必要欄位: ${field}`,
          })
        }
      }

      // Icon validation
      if (manifest.icons) {
        const requiredSizes = ['192x192', '512x512']
        const iconSizes = manifest.icons.map((icon: any) => icon.sizes)

        for (const size of requiredSizes) {
          if (!iconSizes.includes(size)) {
            this.checks.push({
              name: 'PWA Manifest - 圖標尺寸',
              status: 'fail',
              message: `缺少 ${size} 圖標`,
            })
          }
        }
      }

      // App Store optimizations
      if (manifest.categories?.includes('education') &&
          manifest.lang === 'zh-TW' &&
          manifest.display === 'standalone') {
        this.checks.push({
          name: 'PWA Manifest - App Store 優化',
          status: 'pass',
          message: 'App Store 優化配置完整',
        })
      }

      this.checks.push({
        name: 'PWA Manifest',
        status: 'pass',
        message: 'Manifest.json 配置正確',
      })

    } catch (error) {
      this.checks.push({
        name: 'PWA Manifest',
        status: 'fail',
        message: '無法讀取或解析 manifest.json',
        details: error instanceof Error ? error.message : '未知錯誤',
      })
    }
  }

  private async checkOgImage(): Promise<void> {
    const ogImagePath = path.join(this.webDir, 'public/og-image.png')

    try {
      const stats = fs.statSync(ogImagePath)

      // Check file size (should be reasonable)
      const fileSizeKB = stats.size / 1024
      if (fileSizeKB > 500) {
        this.checks.push({
          name: 'Open Graph 圖片 - 檔案大小',
          status: 'warning',
          message: 'OG 圖片檔案較大，可能影響載入速度',
          details: `${fileSizeKB.toFixed(1)} KB`,
        })
      }

      // Check if file exists and is recent
      const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceModified < 1) {
        this.checks.push({
          name: 'Open Graph 圖片',
          status: 'pass',
          message: 'OG 圖片存在且為最新版本',
        })
      } else {
        this.checks.push({
          name: 'Open Graph 圖片',
          status: 'pass',
          message: 'OG 圖片存在',
        })
      }

    } catch (error) {
      this.checks.push({
        name: 'Open Graph 圖片',
        status: 'fail',
        message: '找不到 og-image.png',
      })
    }
  }

  private async checkPwaIcons(): Promise<void> {
    const requiredIcons = [
      'icon-192.png',
      'icon-512.png',
      'apple-touch-icon.png',
      'favicon.ico'
    ]

    for (const iconName of requiredIcons) {
      const iconPath = path.join(this.webDir, 'public', iconName)

      try {
        fs.accessSync(iconPath)
        this.checks.push({
          name: `PWA 圖標 - ${iconName}`,
          status: 'pass',
          message: `${iconName} 存在`,
        })
      } catch (error) {
        this.checks.push({
          name: `PWA 圖標 - ${iconName}`,
          status: 'fail',
          message: `找不到 ${iconName}`,
        })
      }
    }
  }

  private async checkMetadataConfig(): Promise<void> {
    const metadataPath = path.join(this.webDir, 'lib/metadata.ts')

    try {
      const metadataContent = fs.readFileSync(metadataPath, 'utf-8')

      // Check for key metadata elements
      const checks = [
        {
          name: 'Next.js Metadata - 基本資訊',
          pattern: /APP_NAME.*=|APP_TITLE.*=|APP_DESCRIPTION.*=/,
          message: '應用程式基本資訊已配置'
        },
        {
          name: 'Next.js Metadata - Open Graph',
          pattern: /openGraph:/,
          message: 'Open Graph 配置存在'
        },
        {
          name: 'Next.js Metadata - Twitter Card',
          pattern: /twitter:/,
          message: 'Twitter Card 配置存在'
        },
        {
          name: 'Next.js Metadata - 圖標配置',
          pattern: /icons:/,
          message: 'PWA 圖標配置存在'
        },
        {
          name: 'Next.js Metadata - 語言設定',
          pattern: /zh_TW/,
          message: '中文繁體語言設定正確'
        }
      ]

      for (const check of checks) {
        if (check.pattern.test(metadataContent)) {
          this.checks.push({
            name: check.name,
            status: 'pass',
            message: check.message,
          })
        } else {
          this.checks.push({
            name: check.name,
            status: 'fail',
            message: `${check.name} 未找到`,
          })
        }
      }

    } catch (error) {
      this.checks.push({
        name: 'Next.js Metadata 配置',
        status: 'fail',
        message: '無法讀取 metadata.ts',
        details: error instanceof Error ? error.message : '未知錯誤',
      })
    }
  }

  private displayResults(): void {
    const passed = this.checks.filter(c => c.status === 'pass').length
    const warnings = this.checks.filter(c => c.status === 'warning').length
    const failed = this.checks.filter(c => c.status === 'fail').length
    const total = this.checks.length

    console.log('📊 驗證結果總結:')
    console.log(`✅ 通過: ${passed}`)
    console.log(`⚠️  警告: ${warnings}`)
    console.log(`❌ 失敗: ${failed}`)
    console.log(`📈 總計: ${total}\n`)

    // Display detailed results
    this.checks.forEach(check => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'
      console.log(`${icon} ${check.name}`)
      console.log(`   ${check.message}`)
      if (check.details) {
        console.log(`   📝 ${check.details}`)
      }
      console.log('')
    })

    // Overall assessment
    if (failed === 0 && warnings === 0) {
      console.log('🎉 所有 SEO 和 PWA 配置檢查均通過！您的應用已準備好 App Store 優化。')
    } else if (failed === 0) {
      console.log('✅ 核心功能正常，但有一些警告需要注意。')
    } else {
      console.log('❌ 發現配置問題，請修復後再進行 App Store 提交。')
    }
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new SEOVerifier()
  verifier.runVerification().catch(error => {
    console.error('驗證過程中發生錯誤:', error)
    process.exit(1)
  })
}

export { SEOVerifier }

































