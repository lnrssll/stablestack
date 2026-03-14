import { Hono } from 'hono'
import { requireAdmin, clearAdminSession } from '../../middleware/auth'

const app = new Hono()

app.use('*', requireAdmin)

app.get('/', (c) => {
  return c.render(
    <main class="p-8">
      <h1 class="text-2xl font-bold">Admin Dashboard</h1>
      <p>You are logged in as admin.</p>
      <form method="POST" action="/admin/logout" class="mt-4">
        <button type="submit" class="text-sm underline">Logout</button>
      </form>
    </main>,
    { title: 'Admin' }
  )
})

app.post('/logout', (c) => {
  clearAdminSession(c)
  return c.redirect('/')
})

export default app
