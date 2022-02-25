import { defineConfig } from 'vite'
import RubyPlugin from 'vite-plugin-ruby'
import react from '@vitejs/plugin-react'
import inject from '@rollup/plugin-inject'


export default defineConfig({
  'build': {
    'assetsInlineLimit': 30000000
  },
  'plugins': [
    // inject plugin needs to be first
    RubyPlugin(),
    react({
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }
    })
  ],
  'server': {
    'hmr': {
      'host': '127.0.0.1',
      'protocol': 'ws'
    }
  }
})
