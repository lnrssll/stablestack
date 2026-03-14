import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.render(
    <main class="p-8">
      <h1 class="text-2xl font-bold">Welcome</h1>
      <p>This is the public page.</p>
    </main>,
    { title: 'Home' }
  )
})

export default app
