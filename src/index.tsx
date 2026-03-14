import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { renderer } from './middleware/renderer'
import publicRoutes from './routes/public'
import adminRoutes from './routes/admin/index'
import loginRoutes from './routes/admin/login'

const app = new Hono()

// Static assets — serves ./public at /
app.use('*', serveStatic({ root: './public' }))

// Global renderer middleware (sets HTML shell)
app.use('*', renderer)

// Routes
app.route('/', publicRoutes)
app.route('/admin/login', loginRoutes)
app.route('/admin', adminRoutes)

// Dev: Vite handles startup; Prod: start Node server
if (import.meta.env.PROD) {
  serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) })
}

export default app
