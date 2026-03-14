// Typed query functions wrapping the raw SQL in sql.ts.
// One function per query; import `db` from ./client and a constant from ./sql.
//
// Example:
// import { db } from './client'
// import { LIST_POSTS } from './sql'
//
// export type Post = { id: number; title: string; created_at: number }
//
// export function listPosts(): Post[] {
//   return db.prepare(LIST_POSTS).all() as Post[]
// }
