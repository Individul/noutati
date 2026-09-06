'use client';

import { useState } from 'react';

const TABURI = [
  { cheie: '48h', label: '48 ore' },
  { cheie: '7z', label: '7 zile' },
  { cheie: '30z', label: '30 zile' },
];

// Panoul din dreapta: subiectele cele mai acoperite (cele mai multe surse)
// în fereastra de timp selectată. Datele sunt precalculate la build
// (filtrarea lead-ului s-a făcut deja în pagina principală).
export default function PanouPopular({ populare }) {
  const [activ, setActive] = useState('48h');
  const lista = populare[activ] || [];

  return (
    <aside className="panou-popular">
      <div className="sec-head">
        <h2>Cele mai populare</h2>
      </div>

      <div className="taburi">
        {TABURI.map((t) => (
          <button
            key={t.cheie}
            type="button"
            className={activ === t.cheie ? 'tab activ' : 'tab'}
            onClick={() => setActive(t.cheie)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ol className="popular-lista">
        {lista.map((r, i) => (
          <li key={r.id} data-ts={r.ts}>
            <a href={`/stire/${r.id}`}>
              <span className="pop-rank">{i + 1}</span>
              <span className="pop-corp">
                <span className="pop-titlu">{r.titlu}</span>
                <span className="pop-meta">
                  {r.n} {r.n === 1 ? 'sursă' : 'surse'} ·{' '}
                  <span data-timp>{timeAgoLabel(r.ts)}</span>
                </span>
              </span>
            </a>
          </li>
        ))}
        {lista.length === 0 && <li className="pop-gol">Momentan nu sunt date.</li>}
      </ol>
    </aside>
  );
}

function timeAgoLabel(ts) {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'chiar acum';
  if (diffMin < 60) return `acum ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h === 1) return 'acum o oră';
  if (h < 24) return `acum ${h} ore`;
  const zile = Math.floor(h / 24);
  if (zile === 1) return 'ieri';
  if (zile < 7) return `acum ${zile} zile`;
  return new Date(ts).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Chisinau',
  });
}
