import inertia from '@adonisjs/inertia/vite'
import adonisjs from '@adonisjs/vite/client'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isTest = process.env.NODE_ENV === 'test'

export default defineConfig({
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
