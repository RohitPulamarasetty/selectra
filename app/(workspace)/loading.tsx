export default function Loading() {
  return <div className="loading" role="status" aria-label="Loading workspace">
    <div className="skeleton skeleton-title" /><div className="skeleton skeleton-text" />
    <div className="stats-grid">{[1, 2, 3, 4].map((n) => <div key={n} className="skeleton skeleton-card" />)}</div>
    <div className="skeleton skeleton-large" />
  </div>;
}
