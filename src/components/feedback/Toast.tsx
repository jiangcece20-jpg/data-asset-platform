import { useCallback, useEffect, useRef, useState } from 'react';

type ToastItem = {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
};

type ToastFn = {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

let nextId = 0;
const listeners: Set<(items: ToastItem[]) => void> = new Set();
let toastItems: ToastItem[] = [];

function emitChange() {
  listeners.forEach((fn) => fn([...toastItems]));
}

function addItem(type: ToastItem['type'], message: string) {
  const id = nextId++;
  toastItems = [...toastItems, { id, type, message }];
  emitChange();
  setTimeout(() => {
    toastItems = toastItems.filter((t) => t.id !== id);
    emitChange();
  }, 3000);
}

export const toast: ToastFn = {
  success: (msg) => addItem('success', msg),
  error: (msg) => addItem('error', msg),
  warning: (msg) => addItem('warning', msg),
  info: (msg) => addItem('info', msg),
};

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return (
    <div className="ui-toast-container">
      {items.map((item) => (
        <div key={item.id} className={`ui-toast ui-toast--${item.type}`}>
          <span className="ui-toast__icon">{iconForType(item.type)}</span>
          <span className="ui-toast__message">{item.message}</span>
        </div>
      ))}
    </div>
  );
}

function iconForType(type: ToastItem['type']): string {
  switch (type) {
    case 'success':
      return '\u2713';
    case 'error':
      return '\u2717';
    case 'warning':
      return '\u26A0';
    case 'info':
      return '\u2139';
  }
}