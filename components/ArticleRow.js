import { timeAgo } from '@/lib/format';

// Rând tipografic de articol: titlu serif, rezumat opțional,
// meta-rând cu timpul la stânga și sursa la dreapta.
// Linkul duce la pagina de citire internă.
export default function ArticleRow({ item, showSummary = true, mica = false }) {
  return (
    <a
      className={`art ${mica ? 'art-mica' : ''}`}
      href={`/stire/${item.id}`}
    >
      <h3 className="art-title">{item.title}</h3>
      {showSummary && item.summary ? <p className="art-sum">{item.summary}</p> : null}
      <div className="art-meta">
        <span className="art-left">
          <span className="theme">{item.themeLabel}</span>
          <span>{timeAgo(item.ts)}</span>
        </span>
        <span className={item.count > 1 ? 'art-src surse-n' : 'art-src'}>
          {item.count > 1 ? `${item.count} surse` : item.source.name}
        </span>
      </div>
    </a>
  );
}
