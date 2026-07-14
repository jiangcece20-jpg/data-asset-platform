import { useState } from 'react';
import { productLines, type ProductLineKey } from './routes';

type SystemSwitcherProps = {
  currentSystem: ProductLineKey;
};

export function getSystemHref(system: ProductLineKey): string {
  if (system === 'data-asset') return '#search';
  if (system === 'data-source') return '#datasource';
  return 'https://data-asset-platform-chatbi.pages.dev';
}

export function SystemSwitcher({ currentSystem }: SystemSwitcherProps) {
  const [open, setOpen] = useState(false);
  const currentProduct = productLines.find((p) => p.key === currentSystem) ?? productLines[0];

  const handleSystemSelect = (key: ProductLineKey) => {
    setOpen(false);
    if (key === currentSystem) return;

    const href = getSystemHref(key);
    if (href.startsWith('#')) {
      window.location.hash = href.slice(1);
    } else {
      window.location.href = href;
    }
  };

  return (
    <>
      <div className="app-shell__product-switcher" onClick={() => setOpen(!open)}>
        <span aria-hidden="true">{currentProduct.icon}</span>
        <span>{currentProduct.name}</span>
        <span aria-hidden="true">▾</span>
      </div>
      {open && (
        <div className="app-shell__product-dropdown">
          {productLines.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`app-shell__product-item ${p.key === currentSystem ? 'app-shell__product-item--active' : ''}`}
              onClick={() => handleSystemSelect(p.key)}
            >
              <span className="app-shell__product-item-icon">{p.icon}</span>
              <span className="app-shell__product-item-name">{p.name}</span>
              <span className="app-shell__product-item-status">{p.status}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
