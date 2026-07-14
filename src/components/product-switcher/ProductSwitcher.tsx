import { useEffect } from 'react';
import { productLines, type ProductLineKey } from '../../app/routes';

/**
 * 通用产品线切换器的 React 包装。
 *
 * 实际渲染的是框架无关的 Web Component（public/widgets/product-switcher.js），
 * 产品线清单来自远程配置 public/widgets/product-lines.json —— 改配置即全站生效。
 * 其它站点（HTML / Vue / …）接入方式见 docs/组件-产品线切换器-使用说明.md。
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace React.JSX {
    interface IntrinsicElements {
      'product-switcher': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        current?: string;
        'config-url'?: string;
        'fallback-icon'?: string;
        'fallback-name'?: string;
      };
    }
  }
}

const SCRIPT_SRC = '/widgets/product-switcher.js';

function ensureScriptLoaded() {
  if (window.customElements?.get('product-switcher')) return;
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;
  const script = document.createElement('script');
  script.src = SCRIPT_SRC;
  script.defer = true;
  document.head.appendChild(script);
}

type ProductSwitcherProps = {
  currentSystem: ProductLineKey;
};

export function ProductSwitcher({ currentSystem }: ProductSwitcherProps) {
  useEffect(() => {
    ensureScriptLoaded();
  }, []);

  // 脚本/配置加载完成前的兜底展示（来自本地 routes 定义）
  const fallback = productLines.find((p) => p.key === currentSystem);

  return (
    <product-switcher
      current={currentSystem}
      fallback-icon={fallback?.icon}
      fallback-name={fallback?.name}
    />
  );
}
