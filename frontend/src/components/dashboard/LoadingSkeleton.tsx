export default function LoadingSkeleton() {
  return (
    <div className="dl-pipeline-card">
      <div className="dl-skeleton-header">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="dl-skeleton-th" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="dl-skeleton-row-wrap">
          <div className="dl-skeleton-pill" />
          <div className="dl-skeleton-stack">
            <div className="dl-skeleton-line" />
            <div className="dl-skeleton-line dl-skeleton-sm" />
          </div>
          <div className="dl-skeleton-stack">
            <div className="dl-skeleton-line" />
            <div className="dl-skeleton-line dl-skeleton-sm" />
            <div className="dl-skeleton-line dl-skeleton-sm" />
          </div>
          <div className="dl-skeleton-pill" />
          <div className="dl-skeleton-line dl-skeleton-sm" />
          <div className="dl-skeleton-line dl-skeleton-sm" />
          <div className="dl-skeleton-line dl-skeleton-sm" />
          <div className="dl-skeleton-pill dl-skeleton-btn" />
        </div>
      ))}
    </div>
  );
}
