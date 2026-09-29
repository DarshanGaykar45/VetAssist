/**
 * Card component — layered 3D-depth shadow, subtle hover lift
 * Accepts an optional `hover` prop to enable the lift animation
 */
export default function Card({ children, className = '', style, onClick, hover = false }) {
  return (
    <div
      className={`card ${hover ? 'card-hover' : ''} ${className}`.trim()}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, children, className = '' }) {
  return (
    <div className={`card-header ${className}`.trim()}>
      {title && <h3 className="card-title">{title}</h3>}
      {children}
    </div>
  );
}

export function CardBody({ children, className = '', style }) {
  return (
    <div className={`card-body ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return <div className={`card-footer ${className}`.trim()}>{children}</div>;
}
