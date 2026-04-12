import './Badge.css'

/**
 * Variants: accent | success | warning | danger | neutral
 * Sizes:    sm | md
 */
function Badge({ variant = 'neutral', size = 'sm', children, className = '' }) {
  return (
    <span className={`badge badge--${variant} badge--${size} ${className}`}>
      {children}
    </span>
  )
}

export default Badge