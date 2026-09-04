interface EmptyStateProps {
  image: string;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ image, title, body, action, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <img src={image} alt="" className="empty-state-image" />
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-body">{body}</div>
      {onAction && (
        <button className="primary" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
