-- Example TypeSQL query file
-- Run: npx typesql compile  (generates src/db/queries/example.ts)

-- @name ListPosts
SELECT id, title, created_at FROM posts ORDER BY created_at DESC;
