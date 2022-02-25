import { defineConfig } from 'vite'
import RubyPlugin from 'vite-plugin-ruby'
import react from '@vitejs/plugin-react'
import inject from '@rollup/plugin-inject'


export default defineConfig({
  'plugins': [
    // inject plugin needs to be first
    RubyPlugin(),
    react({
      babel: {
        'presets': [
          [
            '@babel/preset-react',
            {
              'runtime': 'automatic' // defaults to classic
            }
          ]
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
