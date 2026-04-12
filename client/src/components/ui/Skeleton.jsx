import './Skeleton.css'

/**
 * Skeleton loader — mirrors the shape of real content.
 * w, h accept any CSS value: "100%", "120px", etc.
 * radius accepts CSS values or "full" for pill shape.
 */
function Skeleton({ w = '100%', h = '16px', radius = 'md', className = '' }) {
  const r = radius === 'full' ? 'var(--radius-full)'
          : radius === 'md'   ? 'var(--radius-md)'
          : radius === 'lg'   ? 'var(--radius-lg)'
          : radius

  return (
    <span
      className={`skeleton ${className}`}
      style={{ width: w, height: h, borderRadius: r }}
      aria-hidden="true"
    />
  )
}

/** Pre-built skeleton for a mosque card */
Skeleton.MosqueCard = function MosqueCardSkeleton() {
  return (
    <div className="skeleton-mosque-card" aria-label="Loading mosque">
      <div className="skeleton-mosque-card__header">
        <Skeleton w="60%" h="20px" />
        <Skeleton w="30%" h="14px" />
      </div>
      <div className="skeleton-mosque-card__grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-mosque-card__cell">
            <Skeleton w="40px" h="11px" />
            <Skeleton w="52px" h="17px" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Skeleton