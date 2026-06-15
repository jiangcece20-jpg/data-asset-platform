import { Checkbox } from './Checkbox';
import './ConditionFieldCheckbox.css';

export type ConditionFieldCheckboxProps = {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
};

export function ConditionFieldCheckbox({ label, options, value, onChange }: ConditionFieldCheckboxProps) {
  const allSelected = options.length > 0 && options.every(opt => value.includes(opt.value));
  const someSelected = options.some(opt => value.includes(opt.value)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map(opt => opt.value));
    }
  };

  const toggleOne = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <div className="condition-field-checkbox">
      <div className="condition-field-checkbox__header">
        <span className="condition-field-checkbox__label">{label}</span>
        <div className="condition-field-checkbox__shortcuts">
          <button
            type="button"
            className="condition-field-checkbox__shortcut"
            onClick={toggleAll}
          >
            {allSelected ? '清空' : '全选'}
          </button>
        </div>
      </div>
      <div className="condition-field-checkbox__list">
        {options.map(opt => (
          <Checkbox
            key={opt.value}
            checked={value.includes(opt.value)}
            indeterminate={someSelected}
            onChange={() => toggleOne(opt.value)}
          >
            {opt.label}
          </Checkbox>
        ))}
      </div>
    </div>
  );
}
