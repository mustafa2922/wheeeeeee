import './Card.css'

/**
 * Base card surface. All mosque/prayer/eid cards build on this.
 * pressable — adds tap feedback for clickable cards
 * inset    — inner padding variant
 */
function Card({
  children,
  pressable  = false,
  inset      = true,
  className  = '',
  onClick,
  ...props
}) {
  const classes = [
    'card',
    pressable && 'card--pressable',
    inset     && 'card--inset',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick
        ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e)
        : undefined
      }
      {...props}
    >
      {children}
    </div>
  )
}

/** Semantic sub-components for consistent card anatomy */
Card.Header = function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`card__header ${className}`} {...props}>
      {children}
    </div>
  )
}

Card.Body = function CardBody({ children, className = '', ...props }) {
  return (
    <div className={`card__body ${className}`} {...props}>
      {children}
    </div>
  )
}

Card.Footer = function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`card__footer ${className}`} {...props}>
      {children}
    </div>
  )
}

export default Card