export default function Loading() {
  return (
    <div className="container results-page" aria-busy="true" aria-label="Loading projects">
      <div className="skeleton" style={{ height: 40, width: '40%', margin: '40px 0 24px' }} />
      <div className="card-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton" style={{ height: 380 }} />
        ))}
      </div>
    </div>
  );
}
