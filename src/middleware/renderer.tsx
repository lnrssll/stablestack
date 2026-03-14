import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children, title }) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title ?? 'App'}</title>
      <link rel="stylesheet" href="/style.css" />
      <script src="/htmx.min.js" defer></script>
    </head>
    <body>{children}</body>
  </html>
), { docType: true })
