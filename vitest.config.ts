import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/e2e/**', // Exclude Playwright e2e tests
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web'),
      '@root': path.resolve(__dirname, '.'),
      '@plms/shared/analytics': path.resolve(__dirname, 'packages/shared/analytics'),
    },
  },
})
