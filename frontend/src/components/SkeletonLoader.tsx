export default function SkeletonLoader() {
  return (
    <div className="skeleton-container">
      <div className="skeleton-line w60" />
      <div className="skeleton-line w80" />
      <div className="skeleton-line w40" />
      <div className="skeleton-card glass">
        <div className="skeleton-line w40" />
        <div className="skeleton-line w60" />
        <div className="skeleton-line w80" />
      </div>
      <div className="skeleton-card glass">
        <div className="skeleton-line w40" />
        <div className="skeleton-line w60" />
        <div className="skeleton-line w80" />
      </div>
    </div>
  );
}
