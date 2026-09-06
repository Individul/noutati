import { getNewsDupaRegiune } from '@/lib/news';
import { CATEGORII } from '@/lib/config';
import { dataLunga } from '@/lib/format';
import LeadStory from '@/components/LeadStory';
import ArticleRow from '@/components/ArticleRow';
import SectionTitle from '@/components/SectionTitle';

export default async function Acasa() {
  const { moldova, extern } = await getNewsDupaRegiune();
  const toate = [...moldova, ...extern].sort((a, b) => b.ts - a.ts);
  const lead = toate[0];
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
