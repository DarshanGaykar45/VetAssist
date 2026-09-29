import EmptyState from './emptystate.jsx';
import Loader from './loader.jsx';

/**
 * Table component
 * columns: [{ key, label, render?, width? }]
 * rows: array of objects
 */
export default function Table({ columns, rows, loading = false, emptyTitle, emptyText, emptyIcon }) {
  if (loading) return <Loader />;

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={col.width ? { width: col.width } : {}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState
                  icon={emptyIcon}
                  title={emptyTitle || 'No records found'}
                  text={emptyText}
                />
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
