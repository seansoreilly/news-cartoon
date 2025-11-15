import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// Get git commit hash
function getGitHash() {
  try {
    // Try Vercel environment variable first (for production)
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7)
    }
    // Fallback to local git command
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    return hash
  } catch (error) {
    console.warn('Could not get git hash:', error)
    return 'unknown'
  }
}

// Get git branch name
function getGitBranch() {
  try {
    // Try Vercel environment variable first
    if (process.env.VERCEL_GIT_COMMIT_REF) {
      return process.env.VERCEL_GIT_COMMIT_REF
    }
    // Fallback to local git command
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
    return branch
  } catch (error) {
    console.warn('Could not get git branch:', error)
    return 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_HASH__: JSON.stringify(getGitHash()),
    __GIT_BRANCH__: JSON.stringify(getGitBranch()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  // @ts-expect-error - Vitest config in vite.config.ts
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/e2e/**', // Exclude Playwright E2E tests
      '**/playwright-tests/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
