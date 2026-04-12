import { forwardRef } from 'react'
import './Button.css'

/**
 * Variants: primary | secondary | ghost | danger
 * Sizes:    sm | md | lg
 * Supports: loading state, icon-only, full-width, disabled
 */
const Button = forwardRef(({
  variant  = 'primary',
  size     = 'md',
  fullWidth = false,
  loading  = false,
  disabled = false,
  iconOnly = false,
  leftIcon = null,
  rightIcon = null,
  children,
  className = '',
  ...props
}, ref) => {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth  && 'btn--full',
    iconOnly   && 'btn--icon-only',
    loading    && 'btn--loading',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {!loading && leftIcon && (
        <span className="btn__icon btn__icon--left" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      {children && <span className="btn__label">{children}</span>}
      {!loading && rightIcon && (
        <span className="btn__icon btn__icon--right" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  )
})

Button.displayName = 'Button'
export default Button