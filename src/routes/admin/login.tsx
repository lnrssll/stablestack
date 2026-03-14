import { Hono } from 'hono'
import { setAdminSession } from '../../middleware/auth'

const app = new Hono()

const LoginForm = ({ error }: { error?: string }) => (
  <main class="p-8 max-w-sm mx-auto">
    <h1 class="text-xl font-bold mb-4">Admin Login</h1>
    {error && <p class="text-red-600 mb-4">{error}</p>}
    <form method="post" action="/admin/login">
      <input name="username" type="text" placeholder="Username" class="block w-full border p-2 mb-2" />
      <input name="password" type="password" placeholder="Password" class="block w-full border p-2 mb-4" />
      <button type="submit" class="bg-black text-white px-4 py-2">Login</button>
    </form>
  </main>
)

app.get('/', (c) => {
  return c.render(<LoginForm />, { title: 'Login' })
})

app.post('/', async (c) => {
  const { username, password } = await c.req.parseBody<{ username: string; password: string }>()

  const validUser = username === process.env.ADMIN_USERNAME
  const validPass = password === process.env.ADMIN_PASSWORD

  if (!validUser || !validPass) {
    return c.render(<LoginForm error="Invalid credentials." />, { title: 'Login' })
  }

  await setAdminSession(c)
  return c.redirect('/admin')
})

export default app
