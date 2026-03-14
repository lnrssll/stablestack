import Database from 'better-sqlite3'
import path from 'node:path'

const DB_PATH = process.env.DATABASE_URL?.replace('sqlite:', '') ?? './db/app.db'

export const db = new Database(path.resolve(DB_PATH))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
