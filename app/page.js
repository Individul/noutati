import { getNewsDupaRegiune } from '@/lib/news';
import { CATEGORII, LEAD_FEREASTRA_ORE } from '@/lib/config';
import { dataLunga } from '@/lib/format';
import LeadStory from '@/components/LeadStory';
import ArticleRow from '@/components/ArticleRow';
import SectionTitle from '@/components/SectionTitle';

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

  const faraLead = (lista) => lista.filter((i) => i.id !== lead?.id).slice(0, 6);
  const temaDin = (slug, n) =>
    toate.filter((i) => i.theme === slug && i.id !== lead?.id).slice(0, n);

  return (
    <main className="container">
      <div className="updated">actualizat automat · {dataLunga(Date.now())}</div>

      {lead && <LeadStory item={lead} />}

      <section className="section">
        <SectionTitle title="Moldova" href="/moldova" />
        {faraLead(moldova).map((item) => (
          <ArticleRow key={item.id} item={item} />
        ))}
      </section>

      <section className="section">
        <SectionTitle title="Extern" href="/extern" />
        {faraLead(extern).map((item) => (
          <ArticleRow key={item.id} item={item} />
        ))}
      </section>

      {CATEGORII.slice(0, 4).map((cat) => {
        const stiri = temaDin(cat.slug, 5);
        if (stiri.length === 0) return null;
        return (
          <section className="section" key={cat.slug}>
            <SectionTitle title={cat.label} href={`/categorie/${cat.slug}`} />
            {stiri.map((item) => (
              <ArticleRow key={item.id} item={item} mica showSummary={false} />
            ))}
          </section>
        );
      })}
    </main>
  );
}
