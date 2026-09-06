import fs from 'fs';
import { getNewsDupaRegiune } from '@/lib/news';
import { LEAD_FEREASTRA_ORE } from '@/lib/config';
import { dataLunga } from '@/lib/format';
import LeadStory from '@/components/LeadStory';
import ArticleRow from '@/components/ArticleRow';
import PanouPopular from '@/components/PanouPopular';

const normalizeazaTitlu = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function citestePopulare() {
  try {
    return JSON.parse(fs.readFileSync('.popular.json', 'utf8'));
  } catch {
    return null;
  }
}

export default async function Acasa() {
  const { moldova, extern } = await getNewsDupaRegiune();
  const toate = [...moldova, ...extern].sort((a, b) => b.ts - a.ts);

  // Lead = cea mai acoperită știre (cele mai multe surse) din ultimele
  // LEAD_FEREASTRA_ORE ore; la egalitate câștigă cea mai nouă. Fără
  // fereastră, o știre veche acoperită de multe redacții ar rămâne
  // blocată în fruntea paginii.
  const acum = Date.now();
  const inFerestra = toate.filter(
    (i) => acum - i.ts <= LEAD_FEREASTRA_ORE * 60 * 60 * 1000
  );
  const lead =
    [...(inFerestra.length ? inFerestra : toate)].sort(
      (a, b) => b.count - a.count || b.ts - a.ts
    )[0] || toate[0];

  // flux cronologic unic: toate știrile rămase, în ordinea publicării
  const flux = toate.filter((i) => i.id !== lead?.id).slice(0, 50);

  // Panoul „Cele mai populare": top după numărul de surse, pe 3 ferestre.
  // 48h se calculează din clusterele curente; 7z/30z din arhiva D1
  // (.popular.json, generat de workflow). Linkurile lead-ului se exclud
  // peste tot, ca subiectul principal să nu apară de două ori.
  const leadLinkuri = new Set((lead?.members || []).map((m) => m.link));
  const leadTitluNorm = normalizeazaTitlu(lead?.title);

  const popular48 = inFerestra
    .filter((i) => i.id !== lead?.id)
    .sort((a, b) => b.count - a.count || b.ts - a.ts)
    .slice(0, 8)
    .map((i) => ({ id: i.id, titlu: i.title, tema: i.themeLabel, ts: i.ts, n: i.count }));

  const dinD1 = citestePopulare();
  const faraLeadD1 = (lista) =>
    (lista || []).filter(
      (r) =>
        r.id !== lead?.id &&
        normalizeazaTitlu(r.titlu) !== leadTitluNorm &&
        !(r.linkuri || []).some((l) => leadLinkuri.has(l))
    );

  const populare = dinD1
    ? {
        '48h': popular48,
        '7z': faraLeadD1(dinD1['7z']),
        '30z': faraLeadD1(dinD1['30z']),
      }
    : null;

  return (
    <main className="container container-larg home-grid">
      <div className="home-main">
        <div className="updated">Actualizat automat · {dataLunga(Date.now())}</div>

        {lead && <LeadStory item={lead} />}

        <div>
          {flux.map((item) => (
            <ArticleRow key={item.id} item={item} />
          ))}
        </div>
      </div>

      {populare && <PanouPopular populare={populare} />}
    </main>
  );
}
