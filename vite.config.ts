import inertia from '@adonisjs/inertia/vite'
import adonisjs from '@adonisjs/vite/client'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isTest = process.env.NODE_ENV === 'test'
const isBundleAnalysis = process.env.BUILD_ANALYZE_BUNDLE === 'true'

function manualChunks(id: string) {
  if (!id.includes('node_modules')) {
    return
  }

  if (id.includes('sonner')) {
    return 'sonner'
  }

  if (id.includes('@inertiajs/react') || id.includes('@adonisjs/inertia')) {
    return 'inertia-vendor'
  }

  if (id.includes('react-dom') || id.includes('/react/') || id.includes('/scheduler/')) {
    return 'react-framework'
  }

  if (id.includes('luxon')) {
    return 'luxon'
  }

  if (id.includes('@tuyau/core')) {
    return 'tuyau'
  }
}

export default defineConfig({
  build: {
    cssMinify: isBundleAnalysis ? false : 'esbuild',
    minify: isBundleAnalysis ? false : 'esbuild',
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
    sourcemap: isBundleAnalysis,
  },

  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
      include: [/\/inertia\/.*\.[jt]sx?$/],
    }),
    inertia({ ssr: { enabled: false, entrypoint: 'inertia/ssr.tsx' } }),
    adonisjs({
      entrypoints: ['inertia/app.tsx', 'inertia/css/tailwind.css'],
      reload: ['app/core/common/resources/views/**/*.edge'],
    }),
  ],

  /**
   * Define aliases for importing modules from
   * your frontend code
   */
  resolve: {
    alias: {
      '@generated': `${import.meta.dirname}/.adonisjs/client/`,
      '~/': `${import.meta.dirname}/inertia/`,
    },
  },

  server: {
    hmr: isTest ? false : undefined,
    watch: {
      ignored: ['**/storage/**', '**/tmp/**'],
    },
  },
})
