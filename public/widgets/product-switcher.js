/**
 * 通用产品线切换器（Web Component，框架无关）
 *
 * 接入（任何站点一行 script + 一个标签）：
 *   <script src="https://data-asset-platform.pages.dev/widgets/product-switcher.js" defer></script>
 *   <product-switcher current="chatbi"></product-switcher>
 *
 * 属性：
 *   current     当前站点的产品线 key（高亮 + 点击不跳转）
 *   config-url  可选，产品线清单 JSON 地址；默认取本脚本同源的 /widgets/product-lines.json
 *
 * 统一改：只改 product-lines.json（新增/改名/换链接/换状态），所有站点即时生效，无需发版。
 */
(function () {
  'use strict';

  if (window.customElements && window.customElements.get('product-switcher')) return;

  // 记录脚本来源，用于推导默认配置地址（跨站引用时指向组件宿主站点）
  var scriptOrigin = window.location.origin;
  try {
    if (document.currentScript && document.currentScript.src) {
      scriptOrigin = new URL(document.currentScript.src).origin;
    }
  } catch (e) { /* 保底用当前站点 */ }

  var STYLE = [
    ':host { display: inline-block; position: relative; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }',
    '.trigger { display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 4px 10px; border-radius: 6px;',
    '  color: rgba(255,255,255,0.85); font-size: 14px; white-space: nowrap; background: transparent; border: none; transition: background .15s; }',
    '.trigger:hover { background: rgba(255,255,255,0.12); color: #fff; }',
    '.arrow { font-size: 10px; opacity: .7; }',
    '.dropdown { position: absolute; top: calc(100% + 8px); left: 0; z-index: 1000; min-width: 220px;',
    '  background: #fff; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.16); padding: 6px; }',
    '.item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: none; border-radius: 8px;',
    '  background: none; cursor: pointer; font-size: 14px; color: #262626; text-align: left; }',
    '.item:hover { background: #f5f5f5; }',
    '.item.active { background: #e6f4ff; color: #1677ff; font-weight: 600; }',
    '.item .name { flex: 1; }',
    '.item .status { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #f5f5f5; color: #8c8c8c; }',
    '.item.active .status { background: #fff; color: #1677ff; }',
  ].join('\n');

  class ProductSwitcherElement extends HTMLElement {
    constructor() {
      super();
      this._products = [];
      this._open = false;
      this._root = this.attachShadow({ mode: 'open' });
      this._onDocClick = this._onDocClick.bind(this);
    }

    static get observedAttributes() { return ['current', 'config-url']; }

    connectedCallback() {
      this._render();
      this._load();
      document.addEventListener('click', this._onDocClick);
    }

    disconnectedCallback() {
      document.removeEventListener('click', this._onDocClick);
    }

    attributeChangedCallback() {
      if (this._root) this._render();
    }

    get _configUrl() {
      return this.getAttribute('config-url') || scriptOrigin + '/widgets/product-lines.json';
    }

    get _current() {
      return this.getAttribute('current') || '';
    }

    _load() {
      var self = this;
      fetch(this._configUrl, { cache: 'no-cache' })
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function (data) {
          self._products = (data && data.products) || [];
          self._render();
          self.dispatchEvent(new CustomEvent('product-switcher:ready', { detail: { count: self._products.length } }));
        })
        .catch(function (err) {
          // 配置拉取失败：降级为只显示当前产品名（不出下拉），不报错打断宿主页面
          self._products = [];
          self._render();
          self.dispatchEvent(new CustomEvent('product-switcher:error', { detail: { message: String(err) } }));
        });
    }

    _onDocClick(e) {
      if (this._open && !e.composedPath().includes(this)) {
        this._open = false;
        this._render();
      }
    }

    _navigate(entry) {
      if (entry.key === this._current) { this._open = false; this._render(); return; }
      this._open = false;
      this._render();
      this.dispatchEvent(new CustomEvent('product-switcher:navigate', { detail: { key: entry.key, url: entry.url } }));
      var isLocalhost = /^(localhost|127\.)/.test(window.location.hostname);
      var sameOrigin = false;
      try { sameOrigin = new URL(entry.url).origin === window.location.origin; } catch (e) { /* relative/hash URL = same origin */ sameOrigin = true; }
      // 同应用内的产品线（带 hash）：本地开发或同源部署时走 hash 路由，不整页跳转
      if (entry.hash && (sameOrigin || isLocalhost)) {
        window.location.hash = entry.hash;
      } else {
        window.location.href = entry.url;
      }
    }

    _render() {
      var current = null;
      for (var i = 0; i < this._products.length; i++) {
        if (this._products[i].key === this._current) { current = this._products[i]; break; }
      }
      var triggerIcon = current ? current.icon : (this.getAttribute('fallback-icon') || '');
      var triggerName = current ? current.name : (this.getAttribute('fallback-name') || '产品');
      var hasList = this._products.length > 0;

      this._root.innerHTML = '';
      var style = document.createElement('style');
      style.textContent = STYLE;
      this._root.appendChild(style);

      var trigger = document.createElement('button');
      trigger.className = 'trigger';
      trigger.type = 'button';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', String(this._open));
      trigger.innerHTML =
        (triggerIcon ? '<span aria-hidden="true">' + triggerIcon + '</span>' : '') +
        '<span>' + triggerName + '</span>' +
        (hasList ? '<span class="arrow" aria-hidden="true">▾</span>' : '');
      var self = this;
      trigger.addEventListener('click', function () {
        if (!hasList) return;
        self._open = !self._open;
        self._render();
      });
      this._root.appendChild(trigger);

      if (this._open && hasList) {
        var dropdown = document.createElement('div');
        dropdown.className = 'dropdown';
        dropdown.setAttribute('role', 'listbox');
        this._products.forEach(function (p) {
          var item = document.createElement('button');
          item.type = 'button';
          item.className = 'item' + (p.key === self._current ? ' active' : '');
          item.setAttribute('role', 'option');
          item.innerHTML =
            '<span aria-hidden="true">' + (p.icon || '') + '</span>' +
            '<span class="name">' + p.name + '</span>' +
            '<span class="status">' + (p.status || '') + '</span>';
          item.addEventListener('click', function () { self._navigate(p); });
          dropdown.appendChild(item);
        });
        this._root.appendChild(dropdown);
      }
    }
  }

  window.customElements.define('product-switcher', ProductSwitcherElement);
})();
