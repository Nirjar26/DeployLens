export default function LoadingSkeleton() {
  return (
    <div className="skeleton-table">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="skeleton-row">
          <div className="skeleton-pill" />
          <div className="skeleton-stack">
            <div className="skeleton-line" />
            <div className="skeleton-line small" />
          </div>
          <div className="skeleton-stack">
            <div className="skeleton-line" />
            <div className="skeleton-line small" />
            <div className="skeleton-line small" />
          </div>
          <div className="skeleton-pill" />
          <div className="skeleton-line small" />
          <div className="skeleton-line small" />
          <div className="skeleton-line small" />
          <div className="skeleton-btn" />
        </div>
      ))}
    </div>
  );
}
