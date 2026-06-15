import { useId, type InputHTMLAttributes } from 'react';
import './forms.css';

type FormControlProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function FormControl({ label, id, ...props }: FormControlProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label className="ui-form-control" htmlFor={inputId}>
      <span className="ui-form-control__label">{label}</span>
      <input className="ui-form-control__input" id={inputId} {...props} />
    </label>
  );
}
