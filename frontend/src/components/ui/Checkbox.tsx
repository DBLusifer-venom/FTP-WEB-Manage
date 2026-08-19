import React, { forwardRef, InputHTMLAttributes, LabelHTMLAttributes } from 'react';
import { cn } from '../../utils/helpers';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  labelClassName?: string;
  wrapperClassName?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    className, 
    label, 
    labelClassName, 
    wrapperClassName, 
    indeterminate,
    disabled,
    id,
    ...props 
  }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substring(2, 9)}`;
    const inputRef = ref || React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate || false;
      }
    }, [indeterminate]);

    return (
      <label 
        className={cn(
          'checkbox-wrapper inline-flex items-center cursor-pointer select-none',
          wrapperClassName,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        htmlFor={checkboxId}
      >
        <input
          ref={inputRef}
          type="checkbox"
          id={checkboxId}
          className={cn(
            'checkbox-input peer appearance-none w-4 h-4 border-2 border-gray-300 rounded bg-white',
            'checked:bg-primary-600 checked:border-primary-600',
            'checked:after:content-[""] checked:after:absolute checked:after:left-1 checked:after:top-0.5 checked:after:w-1.5 checked:after:h-3 checked:after:border-white checked:after:border-r-2 checked:after:border-b-2 checked:after:rotate-45',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          disabled={disabled}
          {...props}
        />
        {label && (
          <span 
            className={cn(
              'checkbox-label ml-2 text-sm text-gray-700 cursor-pointer select-none',
              'peer-checked:text-primary-700 peer-checked:font-medium',
              labelClassName
            )}
          >
            {label}
          </span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

interface CheckboxGroupProps {
  name: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
  disabled?: boolean;
}

export function CheckboxGroup({ 
  name, 
  options, 
  value, 
  onChange, 
  className, 
  orientation = 'vertical',
  disabled 
}: CheckboxGroupProps) {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter(v => v !== optionValue));
    }
  };

  return (
    <fieldset className={cn('space-y-2', className)} disabled={disabled}>
      <legend className="text-sm font-medium text-gray-700 mb-2">{name}</legend>
      <div className={cn('space-y-2', orientation === 'horizontal' && 'flex flex-wrap gap-4')}>
        {options.map(option => (
          <Checkbox
            key={option.value}
            id={`${name}-${option.value}`}
            name={name}
            value={option.value}
            checked={value.includes(option.value)}
            onChange={(e) => handleChange(optionValue, e.target.checked)}
            label={option.label}
            disabled={option.disabled || disabled}
          />
        ))}
      </div>
    </fieldset>
  );
}