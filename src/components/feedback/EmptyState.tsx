import './feedback.css';

type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="ui-empty">
      <div className="ui-empty__title">{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  );
}
