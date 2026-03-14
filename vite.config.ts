import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'
import nodeAdapter from '@hono/vite-dev-server/node'
import build from '@hono/vite-build/node'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    // Reserved for future client-side islands if ever needed
    return {}
  }

  return {
    plugins: [
      devServer({
        adapter: nodeAdapter,
        entry: './src/index.tsx',
      }),
      build({ entry: './src/index.tsx' }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  }
})
