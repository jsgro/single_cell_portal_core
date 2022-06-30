import { defineConfig } from 'vite'
import rubyPlugin from 'vite-plugin-ruby'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

// Match latest non-draft at https://github.com/broadinstitute/single_cell_portal_core/releases
const version = readFileSync('version.txt', { encoding: 'utf8' })

export default defineConfig({
  'define': {
    '__SCP_VERSION__': version,
    '__FRONTEND_SERVICE_WORKER_CACHE__': process.env.VITE_FRONTEND_SERVICE_WORKER_CACHE
  },
  'plugins': [
    // inject plugin needs to be first
    rubyPlugin(),
    react({
      jsxRuntime: 'classic'
    })
  ],
  'server': {
    'hmr': {
      'host': '127.0.0.1',
      'protocol': 'ws'
    }
  }
})
