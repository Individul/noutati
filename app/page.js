import fs from 'fs';
import { getNewsDupaRegiune } from '@/lib/news';
import { LEAD_FEREASTRA_ORE } from '@/lib/config';
import { dataLunga } from '@/lib/format';
import LeadStory from '@/components/LeadStory';
import ArticleRow from '@/components/ArticleRow';
import PanouPopular from '@/components/PanouPopular';

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

  const populare = citestePopulare();

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

      {populare && (
        <PanouPopular populare={populare} leadId={lead?.id} leadTitlu={lead?.title} />
      )}
    </main>
  );
}
