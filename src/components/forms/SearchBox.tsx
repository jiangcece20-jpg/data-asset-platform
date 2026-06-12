import { useState, useRef, useEffect, type ReactNode } from 'react';

export type SuggestionItem = {
  key: string;
  text: string;
  description?: string;
  type?: string;
};

type SearchBoxProps = {
  value?: string;
  placeholder?: string;
  suggestions?: SuggestionItem[];
  onSearch: (query: string) => void;
  onChange?: (value: string) => void;
  className?: string;
};

export function SearchBox({ value, placeholder = '搜索...', suggestions, onSearch, onChange, className = '' }: SearchBoxProps) {
  const [internalValue, setInternalValue] = useState(value ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInternalValue(v);
    onChange?.(v);
    if (suggestions && suggestions.length > 0) {
      setShowSuggestions(v.length > 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(internalValue);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (item: SuggestionItem) => {
    setInternalValue(item.text);
    onChange?.(item.text);
    onSearch(item.text);
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = suggestions?.filter(
    (s) => s.text.toLowerCase().includes(internalValue.toLowerCase()) || (s.description && s.description.toLowerCase().includes(internalValue.toLowerCase()))
  );

  return (
    <div ref={containerRef} className={`ui-search-box ${className}`}>
      <div className="ui-search-box__input-wrap">
        <span className="ui-search-box__icon">&#128269;</span>
        <input
          className="ui-search-box__input"
          type="text"
          placeholder={placeholder}
          value={value ?? internalValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filteredSuggestions && filteredSuggestions.length > 0 && internalValue) setShowSuggestions(true);
          }}
        />
      </div>
      {showSuggestions && filteredSuggestions && filteredSuggestions.length > 0 ? (
        <div className="ui-search-box__suggestions">
          {filteredSuggestions.map((item) => (
            <div key={item.key} className="ui-search-box__suggestion" onClick={() => handleSuggestionClick(item)}>
              {item.type ? <span className="ui-search-box__suggestion-type">{item.type}</span> : null}
              <span className="ui-search-box__suggestion-text">{highlightMatch(item.text, internalValue)}</span>
              {item.description ? <span className="ui-search-box__suggestion-desc">{item.description}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}