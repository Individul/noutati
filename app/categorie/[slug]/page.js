import { getStiriDupaTema } from '@/lib/news';
import { CATEGORII, temaDupaSlug } from '@/lib/config';
import { notFound } from 'next/navigation';
import ArticleRow from '@/components/ArticleRow';

export function generateStaticParams() {
  return CATEGORII.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cat = temaDupaSlug(slug);
  if (!cat) return { title: 'Categorie inexistentă' };
  return {
    title: cat.label,
    description: `${cat.descriere} Știri ${cat.label.toLowerCase()} actualizate automat.`,
  };
}

export default async function PaginaCategorie({ params }) {
  const { slug } = await params;
  const cat = temaDupaSlug(slug);
  if (!cat) notFound();

  const stiri = (await getStiriDupaTema(slug)).slice(0, 60);

  return (
    <main className="container">
      <div className="page-head">
        <span className="kicker">temă</span>
        <h1>{cat.label}</h1>
        <p>{cat.descriere}</p>
      </div>

      <div>
        {stiri.map((item) => (
          <ArticleRow key={item.id} item={item} />
        ))}
        {stiri.length === 0 && (
          <p className="gol">
            Momentan nu sunt știri în această categorie. Revino în câteva
            minute.
          </p>
        )}
      </div>
    </main>
  );
}
