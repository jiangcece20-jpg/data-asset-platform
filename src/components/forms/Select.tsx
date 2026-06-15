import { useEffect, useRef, useState } from 'react';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  onChange?: (value: string) => void;
  className?: string;
};

export function Select({
  value,
  defaultValue,
  options,
  placeholder = '请选择',
  disabled = false,
  searchable = false,
  onChange,
  className = '',
}: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedValue = value ?? internalValue;
  const selectedOption = options.find((o) => o.value === selectedValue);

  const filteredOptions = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()) || o.value.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    setInternalValue(option.value);
    setOpen(false);
    setSearchQuery('');
    onChange?.(option.value);
  };

  const handleToggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
    setSearchQuery('');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`ui-select ${open ? 'ui-select--open' : ''} ${disabled ? 'ui-select--disabled' : ''} ${className}`}>
      <button type="button" className="ui-select__trigger" disabled={disabled} onClick={handleToggle}>
        <span className={`ui-select__value ${selectedOption ? '' : 'ui-select__value--placeholder'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="ui-select__arrow">&#9662;</span>
      </button>
      {open ? (
        <div className="ui-select__dropdown">
          {searchable ? (
            <div className="ui-select__search">
              <input
                className="ui-select__search-input"
                type="text"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          ) : null}
          <div className="ui-select__options">
            {filteredOptions.length === 0 ? (
              <div className="ui-select__empty">无匹配选项</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`ui-select__option ${option.value === selectedValue ? 'ui-select__option--selected' : ''} ${option.disabled ? 'ui-select__option--disabled' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}