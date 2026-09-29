import { Loader2 } from 'lucide-react';

/**
 * Button component
 * variant: primary | secondary | outline | danger | ghost
 * size: sm | md | lg | icon
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  ...props
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : size === 'icon' ? 'btn-icon' : '';
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${sizeClass} ${className}`.trim()}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <Loader2 size={14} className="spinning" style={{ animation: 'spin 700ms linear infinite' }} />}
      {children}
    </button>
  );
}
