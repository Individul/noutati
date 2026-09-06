'use client';

import { useState } from 'react';
import { timeAgo } from '@/lib/format';

const TABURI = [
  { cheie: '48h', label: '48 ore' },
  { cheie: '7z', label: '7 zile' },
  { cheie: '30z', label: '30 zile' },
];

const normalizeazaTitlu = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Panoul din dreapta: subiectele cele mai acoperite (cele mai multe surse)
// în fereastra de timp selectată. Datele sunt precalculate la build.
export default function PanouPopular({ populare, leadId, leadTitlu }) {
  const [activ, setActive] = useState('48h');
  // lead-ul se exclude temeinic: după id ȘI după titlul normalizat
  // (id-ul clusterului se poate schimba între builduri)
  const leadTitluNorm = (leadTitlu || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const lista = (populare[activ] || [])
    .filter(
      (r) =>
        r.id !== leadId &&
        normalizeazaTitlu(r.titlu) !== leadTitluNorm
    )
    .slice(0, 8);

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
                  <span data-timp>{timeAgo(r.ts)}</span>
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
