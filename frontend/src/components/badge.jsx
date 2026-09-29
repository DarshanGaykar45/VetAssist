/**
 * Badge component
 * variant: success | warning | error | info | default | primary
 */
export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()}>
      {children}
    </span>
  );
}
