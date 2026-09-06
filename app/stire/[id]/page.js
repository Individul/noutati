import { Suspense } from 'react';
import fs from 'fs';
import { getNews, corecteazaData } from '@/lib/news';
import { getArticol } from '@/lib/article';
import { genereazaSumar } from '@/lib/ai';
import { timeAgo, dataLunga } from '@/lib/format';
import { notFound } from 'next/navigation';

// Build static: subiectele curente devin pagini la fiecare build
// (GitHub Actions la fiecare 20 min — vezi .github/workflows/).
// Generăm doar subiectele recente (cele afișabile) — ca buildul să rămână rapid.
const MAX_SUBIECTE = 120;

export async function generateStaticParams() {
  const subiecte = await getNews();
  return subiecte.slice(0, MAX_SUBIECTE).map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const subiect = (await getNews()).find((i) => i.id === id);
  if (!subiect) return { title: 'Știre inexistentă' };
  return { title: subiect.title, description: subiect.summary };
}

export default async function PaginaStire({ params }) {
  const { id } = await params;
  const subiecte = await getNews();
  const subiect = subiecte.find((i) => i.id === id);
  if (!subiect) notFound();

  return (
    <main className="container">
      <article className="reader">
        <a className="reader-back" href="/">
          ← prima pagină
        </a>

        <span className="kicker">{subiect.themeLabel}</span>
        <h1 className="reader-title">{subiect.title}</h1>

        <div className="reader-meta">
          <span>
            {subiect.count > 1 ? `${subiect.count} surse` : subiect.source.name}{' '}
            · {timeAgo(subiect.ts)} · {dataLunga(subiect.ts)}
          </span>
        </div>

        {/* Sumarul (extragere + AI) se livrează în surge: pagina se
            deschide instant, textul apare imediat după generare. */}
        <Suspense fallback={<SumarInAsteptare subiect={subiect} />}>
          <SumarSubiect subiect={subiect} />
        </Suspense>

        <section className="surse">
          <div className="sec-head">
            <h2>Sursele subiectului</h2>
          </div>
          {subiect.members.map((m, idx) => (
            <a
              key={idx}
              className="sursa"
              href={m.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sursa-title">{m.title}</span>
              <span className="sursa-meta">
                {m.source.name} · {timeAgo(m.ts)}
              </span>
            </a>
          ))}
        </section>

        <p className="reader-legal">
          {ai.ok
            ? 'Sumarul este generat automat de un sistem AI pe baza articolelor de la sursele de mai jos; articolele integrale aparțin în totalitate surselor originale.'
            : 'Textul de mai sus este preluat parțial din articolele surselor originale, menționate mai jos; aici apar fără publicitate, pentru o lectură liniștită.'}
        </p>
      </article>
    </main>
  );
}

// Fallback-ul afișat instant, cât timp lucrează extragerea + GLM.
function SumarInAsteptare({ subiect }) {
  return (
    <div className="sumar-asteptare">
      {subiect.summary ? (
        <div className="reader-body">
          <p>{subiect.summary}</p>
        </div>
      ) : null}
      <p className="generare">
        <span className="puls" /> se generează sumarul complet…
      </p>
    </div>
  );
}

// Componenta lentă (extragere + GLM), livrată prin streaming.
async function SumarSubiect({ subiect }) {
  const primele = subiect.members.slice(0, 4);
  const extrase = await Promise.all(primele.map((m) => getArticol(m.link)));

  let textRezerva = null;
  let sursaText = null;
  let trunchiat = false;
  const materiale = [];
  primele.forEach((m, i) => {
    const a = extrase[i];
    // data reală din meta-articol corectează timestamp-ul afișat
    if (a.data) corecteazaData(m.link, a.data);
    if (!a.ok) return;
    materiale.push({ sursa: m.source.name, text: a.paragrafe.join('\n\n').slice(0, 1400) });
    if (!textRezerva) {
      textRezerva = a.paragrafe;
      sursaText = m.source.name;
      trunchiat = a.trunchiat;
    }
  });

  const ai = await genereazaSumar(subiect, materiale);

  // Arhiva D1 (1 an): subiectul se înregistrează la build; upload-ul se face
  // în workflow prin wrangler (scripts/genereaza-insereaza.mjs).
  try {
    const scrise = (globalThis.__subiecteInArhiva ||= new Set());
    if (!scrise.has(subiect.id)) {
      scrise.add(subiect.id);
      const rand = {
        id: subiect.id,
        titlu: subiect.title,
        sumar: ai.ok ? ai.text : null,
        text: textRezerva ? textRezerva.join('\n\n') : null,
        rezumat: subiect.summary || null,
        tema: subiect.themeLabel,
        regiune: subiect.region,
        ts: subiect.ts,
        surse: subiect.members,
      };
      fs.appendFileSync('.subiecte-build.jsonl', JSON.stringify(rand) + '\n');
    }
  } catch {
    // arhiva nu trebuie să blocheze niciodată randarea paginii
  }

  return (
    <>
      {ai.ok && (
        <div className="reader-ai-linie">
          <span className="ai-tag">sumar automat</span>
        </div>
      )}
      {ai.ok ? (
        <div className="reader-body">
          {ai.text
            .split(/\n{2,}/)
            .filter((p) => p.trim())
            .map((p, idx) => (
              <p key={idx}>{p.trim()}</p>
            ))}
        </div>
      ) : textRezerva ? (
        <>
          <div className="reader-body">
            {textRezerva.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
          {trunchiat && (
            <div className="reader-notice">
              Fragment din textul sursei {sursaText}. Continuarea — la
              publicațiile de mai jos.
            </div>
          )}
        </>
      ) : subiect.summary ? (
        <div className="reader-body">
          <p>{subiect.summary}</p>
        </div>
      ) : (
        <div className="reader-notice">
          Subiectul este acoperit de publicațiile de mai jos.
        </div>
      )}
    </>
  );
}
