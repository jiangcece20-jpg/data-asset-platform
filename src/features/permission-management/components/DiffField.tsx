type DiffFieldProps = {
  label: string;
  before: string;
  after: string;
};

export function DiffField({ label, before, after }: DiffFieldProps) {
  if (!before.trim() || !after.trim()) return null;
  return (
    <div className="permission-management__diff-field">
      <span className="permission-management__diff-label">{label}</span>
      <span className="permission-management__diff-before">{before}</span>
      <span aria-hidden="true">→</span>
      <span className="permission-management__diff-after primary">{after}</span>
    </div>
  );
}
