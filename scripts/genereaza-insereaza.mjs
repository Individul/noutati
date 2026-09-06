// Generează insereaza.sql din subiectele colectate la build
// (.subiecte-build.jsonl), pentru încărcarea în arhiva D1:
//   node scripts/genereaza-insereaza.mjs
//   npx wrangler d1 execute noutati-arhiva --remote --file=insereaza.sql
import fs from 'fs';

const FISIER_INTRARE = '.subiecte-build.jsonl';
const ZILE_RETENTIE = 365;

const esc = (v) =>
  v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;

const stmts = [
  `CREATE TABLE IF NOT EXISTS subiecte (
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
);`,
  `DELETE FROM subiecte WHERE creat < unixepoch() - ${ZILE_RETENTIE} * 86400;`,
];

if (fs.existsSync(FISIER_INTRARE)) {
  const linii = fs.readFileSync(FISIER_INTRARE, 'utf8').split('\n').filter(Boolean);
  for (const linie of linii) {
    try {
      const o = JSON.parse(linie);
      if (!o.id || !o.titlu) continue;
      stmts.push(
        `INSERT INTO subiecte (id, titlu, sumar, text, rezumat, tema, regiune, ts, surse, creat)
VALUES (${esc(o.id)}, ${esc(o.titlu)}, ${esc(o.sumar)}, ${esc(o.text)}, ${esc(o.rezumat)}, ${esc(o.tema)}, ${esc(o.regiune)}, ${o.ts}, ${esc(JSON.stringify(o.surse))}, unixepoch())
ON CONFLICT(id) DO UPDATE SET
  titlu = excluded.titlu,
  sumar = excluded.sumar,
  text = excluded.text,
  rezumat = excluded.rezumat,
  tema = excluded.tema,
  regiune = excluded.regiune,
  ts = excluded.ts,
  surse = excluded.surse;`
      );
    } catch {
      // linie incompletă — o sărim
    }
  }
}

fs.writeFileSync('insereaza.sql', stmts.join('\n'));
console.log(`insereaza.sql: ${stmts.length - 2} subiecte de inserat`);
