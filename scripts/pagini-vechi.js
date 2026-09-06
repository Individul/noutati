// Gestionarea arhivei de pagini vechi, ca linkurile partajate să trăiască
// mai mult de un ciclu de build. Se rulează în GitHub Actions:
//   node scripts/pagini-vechi.js arhiveaza  — după build: paginile noi intră
//                                             în arhivă + curățare > 7 zile
//   node scripts/pagini-vechi.js restituie  — înainte de deploy: arhiva
//                                             se lipește la loc în out/
const fs = require('fs');
const path = require('path');

const ARHIVA = path.join(process.cwd(), '.pagini-vechi', 'stire');
const OUT = path.join(process.cwd(), 'out', 'stire');
const ZILE = 7;

function asigura(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const comanda = process.argv[2];

if (comanda === 'arhiveaza') {
  asigura(ARHIVA);
  asigura(OUT);

  // paginile noi intră în arhivă (fără a le suprascrie pe cele vechi,
  // ca să nu le resetăm vârsta); păstrăm mtime-ul pentru curățare
  let noi = 0;
  for (const f of fs.readdirSync(OUT)) {
    if (!f.endsWith('.html')) continue;
    const src = path.join(OUT, f);
    const dst = path.join(ARHIVA, f);
    if (!fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
      const st = fs.statSync(src);
      fs.utimesSync(dst, st.atime, st.mtime);
      noi++;
    }
  }

  // curățare: pagini mai vechi de 7 zile ies din arhivă
  const limita = Date.now() - ZILE * 24 * 60 * 60 * 1000;
  let sterse = 0;
  for (const f of fs.readdirSync(ARHIVA)) {
    const p = path.join(ARHIVA, f);
    if (fs.statSync(p).mtimeMs < limita) {
      fs.unlinkSync(p);
      sterse++;
    }
  }

  console.log(
    `arhivă: ${fs.readdirSync(ARHIVA).length} pagini (noi: ${noi}, șterse după ${ZILE} zile: ${sterse})`
  );
}

if (comanda === 'restituie') {
  asigura(ARHIVA);
  asigura(OUT);
  let n = 0;
  for (const f of fs.readdirSync(ARHIVA)) {
    const src = path.join(ARHIVA, f);
    const dst = path.join(OUT, f);
    if (!fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
      n++;
    }
  }
  console.log(`pagini vechi restituite în out/: ${n}`);
}
