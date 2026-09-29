/**
 * Loader / spinner component
 */
export default function Loader({ text = 'Loading...' }) {
  return (
    <div className="loader-container" role="status" aria-label={text}>
      <div className="spinner" />
      <span>{text}</span>
    </div>
  );
}
