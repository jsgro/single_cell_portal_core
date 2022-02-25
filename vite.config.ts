import { defineConfig } from 'vite'
import rubyPlugin from 'vite-plugin-ruby'
import react from '@vitejs/plugin-react'


export default defineConfig({
  'mode': 'development', // < this is important
  'build': {
    minify: false,
    sourcemap: true // < this allows the browser to point you to the correct file
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
