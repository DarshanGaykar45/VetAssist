import { useId } from 'react';

/**
 * Input / Select / Textarea component
 */
export default function Input({
  label,
  error,
  type = 'text',
  iconLeft,
  iconRight,
  className = '',
  id,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hasLeft  = !!iconLeft;
  const hasRight = !!iconRight;

  return (
    <div className="form-group">
      {label && <label className="form-label" htmlFor={inputId}>{label}</label>}
      <div className="input-wrapper">
        {iconLeft && <span className="input-icon-left">{iconLeft}</span>}
        <input
          id={inputId}
          type={type}
          className={`form-input ${hasLeft ? 'has-left' : ''} ${hasRight ? 'has-right' : ''} ${error ? 'error' : ''} ${className}`.trim()}
          {...props}
        />
        {iconRight && <span className="input-icon-right">{iconRight}</span>}
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

export function Select({ label, error, children, options, className = '', id, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <div className="form-group">
      {label && <label className="form-label" htmlFor={inputId}>{label}</label>}
      <select
        id={inputId}
        className={`form-input ${error ? 'error' : ''} ${className}`.trim()}
        {...props}
      >
        {Array.isArray(options) &&
          options.map((opt) => (
            <option key={opt.value !== undefined ? opt.value : opt} value={opt.value !== undefined ? opt.value : opt}>
              {opt.label !== undefined ? opt.label : opt}
            </option>
          ))}
        {children}
      </select>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

export function Textarea({ label, error, className = '', id, rows = 3, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <div className="form-group">
      {label && <label className="form-label" htmlFor={inputId}>{label}</label>}
      <textarea
        id={inputId}
        rows={rows}
        className={`form-input ${error ? 'error' : ''} ${className}`.trim()}
        style={{ resize: 'vertical' }}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
