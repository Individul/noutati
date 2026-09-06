// Preprocesează rezultatul interogării D1 (.d1-raw.json) în .popular.json:
// trei liste (48h / 7 zile / 30 zile) cu subiectele cele mai acoperite.
//   node scripts/genereaza-popular.mjs
import fs from 'fs';

const FISIER_INTRARE = '.d1-raw.json';
const FISIER_IESIRE = '.popular.json';
const TOP = 8;

const FERESTRE = {
  '48h': 2,
  '7z': 7,
  '30z': 30,
};

const out = fs.readFileSync(FISIER_INTRARE, 'utf8');
const start = out.indexOf('[');
const j = JSON.parse(out.slice(start, out.lastIndexOf(']') + 1));
const randuri = j[0]?.results || [];

const acum = Date.now();
const populare = {};

for (const [cheie, zile] of Object.entries(FERESTRE)) {
  const limita = acum - zile * 24 * 60 * 60 * 1000;
  populare[cheie] = randuri
    .filter((r) => r.ts * 1000 >= limita && r.titlu && r.n > 0)
    .sort((a, b) => b.n - a.n || b.ts - a.ts)
    .slice(0, TOP)
    .map((r) => {
      let linkuri = [];
      try {
        linkuri = (JSON.parse(r.surse || '[]') || []).map((s) => s.link).filter(Boolean);
      } catch {
        linkuri = [];
      }
      return { id: r.id, titlu: r.titlu, tema: r.tema, ts: r.ts, n: r.n, linkuri };
    });
}

fs.writeFileSync(FISIER_IESIRE, JSON.stringify(populare));
console.log(
  '.popular.json:',
  Object.entries(populare)
    .map(([k, v]) => `${k}=${v.length}`)
    .join(', ')
);
