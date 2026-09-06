-- Arhiva de subiecte (Cloudflare D1). Se creează o singură dată:
--   npx wrangler d1 create noutati-arhiva
--   npx wrangler d1 execute noutati-arhiva --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS subiecte (
  id      TEXT PRIMARY KEY,
  titlu   TEXT,
  sumar   TEXT,
  text    TEXT,
  rezumat TEXT,
  tema    TEXT,
  regiune TEXT,
  ts      INTEGER,
  surse   TEXT,
  creat   INTEGER DEFAULT (unixepoch())
);
