import { defineConfig } from 'vite'
import rubyPlugin from 'vite-plugin-ruby'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const version = readFileSync('version.txt', { encoding: 'utf8' })

export default defineConfig({
  'define': {
    '__SCP_VERSION__': version
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
