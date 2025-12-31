#!/usr/bin/env tsx
/**
 * 字段映射合規性檢查腳本
 * 
 * 掃描所有 API Route 文件，檢查是否存在字段命名不一致問題
 * 集成到專案的架構檢查流程中
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

interface ComplianceIssue {
  file: string
  line: number
  type: 'field_naming_inconsistency' | 'manual_response_construction' | 'missing_transformation'
  message: string
  suggestion?: string
}

/**
 * 檢查單個文件的合規性
 */
function checkFileCompliance(filePath: string): ComplianceIssue[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const issues: ComplianceIssue[] = []

  lines.forEach((line, index) => {
    const lineNumber = index + 1

    // 檢查是否在 API 響應中混用 snake_case
    if (line.includes('user_id:') && filePath.includes('api/')) {
      issues.push({
        file: filePath,
        line: lineNumber,
        type: 'field_naming_inconsistency',
        message: '在 API 響應中使用了 snake_case 字段名 "user_id"',
        suggestion: '請使用 "userId" 或者使用 okWithTransform() 自動轉換'
      })
    }

    if (line.includes('pack_id:') && filePath.includes('api/') && !line.includes('.eq(')) {
      issues.push({
        file: filePath,
        line: lineNumber,
        type: 'field_naming_inconsistency',
        message: '在 API 響應中使用了 snake_case 字段名 "pack_id"',
        suggestion: '請使用 "packId" 或者使用 okWithTransform() 自動轉換'
      })
    }

    // 檢查是否手動構建響應對象
    if (line.includes('{ success: true') && !line.includes('ok(') && !line.includes('okWithTransform(')) {
      issues.push({
        file: filePath,
        line: lineNumber,
        type: 'manual_response_construction',
        message: '手動構建 API 響應對象',
        suggestion: '請使用 ok() 或 okWithTransform() 構建響應'
      })
    }

    // 檢查是否使用了新的轉換函數
    if (line.includes('created_at') && line.includes('updated_at') && !line.includes('okWithTransform')) {
      // 這可能是需要轉換的數據庫記錄
      if (line.includes('return') || line.includes('NextResponse.json')) {
        issues.push({
          file: filePath,
          line: lineNumber,
          type: 'missing_transformation',
          message: '可能需要使用字段轉換',
          suggestion: '如果這是數據庫記錄，請考慮使用 okWithTransform() 自動轉換字段名'
        })
      }
    }
  })

  return issues
}

/**
 * 掃描所有相關文件
 */
async function scanAllFiles(): Promise<ComplianceIssue[]> {
  const patterns = [
    'app/api/**/*.ts',
    'apps/web/app/api/**/*.ts',
    'lib/services/**/*.ts',
    'apps/web/lib/services/**/*.ts'
  ]

  let allIssues: ComplianceIssue[] = []

  for (const pattern of patterns) {
    try {
      const files = await glob(pattern, { cwd: process.cwd() })
      
      for (const file of files) {
        if (fs.existsSync(file)) {
          const issues = checkFileCompliance(file)
          allIssues = allIssues.concat(issues)
        }
      }
    } catch (error) {
      // 某些路徑可能不存在，靜默處理
    }
  }

  return allIssues
}

/**
 * 生成合規性報告
 */
function generateReport(issues: ComplianceIssue[]): void {
  console.log('🔍 字段映射合規性檢查報告')
  console.log('=' * 50)

  if (issues.length === 0) {
    console.log('✅ 未發現合規性問題！')
    return
  }

  // 按問題類型分組
  const groupedIssues = issues.reduce((acc, issue) => {
    if (!acc[issue.type]) {
      acc[issue.type] = []
    }
    acc[issue.type].push(issue)
    return acc
  }, {} as Record<string, ComplianceIssue[]>)

  Object.entries(groupedIssues).forEach(([type, typeIssues]) => {
    console.log(`\n📋 ${getTypeDisplayName(type)} (${typeIssues.length} 個問題)`)
    console.log('-'.repeat(40))

    typeIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}:${issue.line}`)
      console.log(`   問題: ${issue.message}`)
      if (issue.suggestion) {
        console.log(`   建議: ${issue.suggestion}`)
      }
      console.log()
    })
  })

  console.log('📊 總結:')
  console.log(`   發現問題: ${issues.length} 個`)
  console.log(`   涉及文件: ${new Set(issues.map(i => i.file)).size} 個`)
}

/**
 * 獲取問題類型的顯示名稱
 */
function getTypeDisplayName(type: string): string {
  const displayNames: Record<string, string> = {
    field_naming_inconsistency: '字段命名不一致',
    manual_response_construction: '手動構建響應',
    missing_transformation: '缺少字段轉換'
  }
  return displayNames[type] || type
}

/**
 * 檢查特定文件
 */
function checkSpecificFiles(files: string[]): ComplianceIssue[] {
  let allIssues: ComplianceIssue[] = []

  files.forEach(file => {
    if (fs.existsSync(file)) {
      const issues = checkFileCompliance(file)
      allIssues = allIssues.concat(issues)
    } else {
      console.warn(`⚠️  文件不存在: ${file}`)
    }
  })

  return allIssues
}

// 主函數
async function main() {
  const args = process.argv.slice(2)

  let issues: ComplianceIssue[] = []

  if (args.length > 0) {
    // 檢查指定文件
    console.log('🔍 檢查指定文件...')
    issues = checkSpecificFiles(args)
  } else {
    // 檢查所有文件
    console.log('🔍 掃描所有相關文件...')
    issues = await scanAllFiles()
  }

  generateReport(issues)

  // 如果有問題，以非零狀態碼退出
  process.exit(issues.length > 0 ? 1 : 0)
}

if (require.main === module) {
  main().catch(console.error)
}

export { checkFileCompliance, scanAllFiles }