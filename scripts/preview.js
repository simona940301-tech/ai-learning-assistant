#!/usr/bin/env node
/**
 * PLMS Preview Mode - Cross-platform Node.js version
 * For Windows compatibility
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
}

console.log(`${colors.blue}╔════════════════════════════════════════╗${colors.reset}`)
console.log(`${colors.blue}║   PLMS Preview Mode - Batch 1.5        ║${colors.reset}`)
console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`)
console.log('')

// Load .env.preview
const envPath = path.join(__dirname, '..', '.env.preview')
if (fs.existsSync(envPath)) {
  console.log(`${colors.green}✓${colors.reset} Loading .env.preview configuration...`)
  
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=')
      if (key && value) {
        process.env[key] = value
      }
    }
  })
  
  // Show active flags
  console.log(`\n${colors.yellow}Active Batch 1.5 Flags:${colors.reset}`)
  console.log(`  • HOTFIX_BATCH1_5: ${process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5}`)
  console.log(`  • SINGLE_CTA: ${process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA}`)
  console.log(`  • NEAR_DIFFICULTY: ${process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_NEAR_DIFFICULTY}`)
  console.log(`  • BATCH_API: ${process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_BATCH_API}`)
  console.log(`  • SAMPLER_PERF: ${process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF}`)
} else {
  console.log(`${colors.yellow}⚠${colors.reset}  .env.preview not found, using defaults`)
}

// Start dev server
console.log(`\n${colors.green}✓${colors.reset} Starting Next.js development server...`)
console.log(`${colors.blue}→${colors.reset} HMR (Hot Module Replacement) enabled`)
console.log(`${colors.blue}→${colors.reset} Auto-refresh on file save`)
console.log('')

// Open browser after delay
setTimeout(() => {
  const open = require('child_process').exec
  const url = 'http://localhost:3000'
  
  // Cross-platform browser opening
  const startCmd = process.platform === 'darwin' ? 'open' :
                   process.platform === 'win32' ? 'start' : 'xdg-open'
  
  open(`${startCmd} ${url}`, (err) => {
    if (err) {
      console.log(`${colors.yellow}⚠${colors.reset}  Browser not opened automatically. Visit: ${url}`)
    }
  })
}, 5000)

// Spawn Next.js dev server
const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
})

child.on('exit', (code) => {
  process.exit(code)
})

// Handle Ctrl+C
process.on('SIGINT', () => {
  child.kill('SIGINT')
  process.exit(0)
})

