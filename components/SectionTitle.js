export default function SectionTitle({ title, href, eticheta }) {
  return (
    <div className="sec-head">
      <h2>{title}</h2>
      {href && (
        <a className="sec-more" href={href}>
          {eticheta || 'toate'} →
        </a>
      )}
    </div>
  );
}
