import { createMiddleware } from 'hono/factory'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'

export const SESSION_COOKIE = 'admin_session'
const SESSION_DURATION = 60 * 60 * 8 // 8 hours

export const requireAdmin = createMiddleware(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return c.redirect('/admin/login')
  try {
    await verify(token, process.env.SESSION_SECRET!, 'HS256')
  } catch (err) {
    console.warn('[auth] invalid session token:', err)
    return c.redirect('/admin/login')
  }
  await next()
})

export async function setAdminSession(c: Parameters<typeof setCookie>[0]) {
  const token = await sign(
    { sub: 'admin', exp: Math.floor(Date.now() / 1000) + SESSION_DURATION },
    process.env.SESSION_SECRET!,
    'HS256'
  )
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Strict',
    secure: import.meta.env.PROD,
    maxAge: SESSION_DURATION,
    path: '/',
  })
}

export function clearAdminSession(c: Parameters<typeof deleteCookie>[0]) {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}
