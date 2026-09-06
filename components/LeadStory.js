import { timeAgo } from '@/lib/format';

// Știrea principală de sus: titlu serif mare, rezumat, meta-rând.
// Deschide pagina de citire internă, nu sursa.
export default function LeadStory({ item }) {
  return (
    <a className="lead" href={`/stire/${item.id}`} data-ts={item.ts}>
      <span className="kicker">{item.themeLabel}</span>
      <h1 className="lead-title">{item.title}</h1>
      <p className="lead-sum">{item.summary}</p>
      <div className="art-meta">
        <span className="art-left">
          <span data-timp>{timeAgo(item.ts)}</span>
        </span>
        <span className={item.count > 1 ? 'art-src surse-n' : 'art-src'}>
          {item.count > 1 ? `${item.count} surse` : item.source.name}
        </span>
      </div>
    </a>
  );
}
