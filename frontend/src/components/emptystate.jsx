export default function EmptyState({ title, text, icon: Icon, emoji, action }) {
  return (
    <div className="empty-state">
      {emoji && <div className="empty-state-emoji">{emoji}</div>}
      {!emoji && Icon && (
        <div className="empty-state-icon"><Icon size={28} /></div>
      )}
      <p className="empty-state-title">{title}</p>
      {text && <p className="empty-state-text">{text}</p>}
      {action && <div style={{ marginTop: "0.75rem" }}>{action}</div>}
    </div>
  );
}
