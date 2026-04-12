import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const japaPatterns = [
  '**/*_spec.{ts,js}',
  '**/*.spec.{ts,js}',
  '**/*_int.{ts,js}',
  '**/*_feat.{ts,js}',
  '**/*_e2e.{ts,js}',
]

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          environment: 'node',
          exclude: [...japaPatterns, 'node_modules/**'],
          include: ['app/**/*.test.ts'],
          name: 'backend',
          restoreMocks: true,
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            '@generated': `${import.meta.dirname}/.adonisjs/client/`,
            '~/': `${import.meta.dirname}/inertia/`,
          },
        },
        test: {
          environment: 'jsdom',
          exclude: [...japaPatterns, 'node_modules/**'],
          include: ['inertia/**/*.test.ts', 'inertia/**/*.test.tsx'],
          name: 'frontend',
          restoreMocks: true,
          setupFiles: ['./inertia/test_setup.ts'],
        },
      },
    ],
  },
})
