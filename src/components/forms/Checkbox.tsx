import { useEffect, useRef, type InputHTMLAttributes, type ReactNode } from 'react';

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  indeterminate?: boolean;
  children?: ReactNode;
};

export function Checkbox({ indeterminate = false, children, className = '', ...props }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label className={`ui-checkbox ${indeterminate ? 'ui-checkbox--indeterminate' : ''} ${className}`}>
      <input ref={ref} type="checkbox" className="ui-checkbox__input" {...props} />
      {children ? <span className="ui-checkbox__label">{children}</span> : null}
    </label>
  );
}