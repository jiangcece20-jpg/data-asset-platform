import './base.css';

export type TabItem = {
  key: string;
  label: string;
};

type TabsProps = {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
};

export function Tabs({ items, activeKey, onChange }: TabsProps) {
  return (
    <div className="ui-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.key}
          className={item.key === activeKey ? 'ui-tabs__item ui-tabs__item--active' : 'ui-tabs__item'}
          type="button"
          role="tab"
          aria-selected={item.key === activeKey}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
