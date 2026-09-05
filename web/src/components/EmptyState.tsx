interface EmptyStateProps {
  image: string;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  /** Shows a spinner in place of the action label and disables it. */
  busy?: boolean;
}

export function EmptyState({ image, title, body, action, onAction, busy }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <img src={image} alt="" className="empty-state-image" />
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-body">{body}</div>
      {onAction && (
        <button className="primary" onClick={onAction} disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" />
              模擬中…
            </>
          ) : (
            action
          )}
        </button>
      )}
    </div>
  );
}
