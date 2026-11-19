'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container page">
      <div className="empty">
        <h2 className="empty__title">Something went wrong</h2>
        <p className="muted">The page could not be loaded. Please try again.</p>
        <button className="btn btn-ghost" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}
