import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../utils/helpers';

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  labelClassName?: string;
  wrapperClassName?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ 
    className, 
    label, 
    labelClassName, 
    wrapperClassName, 
    disabled,
    id,
    name,
    ...props 
  }, ref) => {
    const radioId = id || `radio-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <label 
        className={cn(
          'radio-wrapper inline-flex items-center cursor-pointer select-none',
          wrapperClassName,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        htmlFor={radioId}
      >
        <input
          ref={ref}
          type="radio"
          id={radioId}
          name={name}
          className={cn(
            'radio-input peer appearance-none border-2 border-gray-300 rounded-full bg-white checked:border-primary-600',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'after:content-[""] after:absolute after:left-1/2 after:top-1/2 after:w-1.5 after:h-1.5 after:bg-primary-600 after:rounded-full after:opacity-0 after:scale-50 after:transition-all after:duration-200 after:-translate-x-1/2 after:-translate-y-1/2',
            'peer-checked:after:opacity-100 peer-checked:after:scale-100',
            className
          )}
          disabled={disabled}
          {...props}
        />
        {label && (
          <span 
            className={cn(
              'radio-label ml-2 text-sm text-gray-700 cursor-pointer select-none',
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

Radio.displayName = 'Radio';

interface RadioGroupProps {
  name: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
  disabled?: boolean;
}

export function RadioGroup({ 
  name, 
  options, 
  value, 
  onChange, 
  className, 
  orientation = 'vertical',
  disabled 
}: RadioGroupProps) {
  return (
    <fieldset className={cn('space-y-2', className)} disabled={disabled}>
      <legend className="text-sm font-medium text-gray-700 mb-2">{name}</legend>
      <div className={cn('space-y-2', orientation === 'horizontal' && 'flex flex-wrap gap-4')}>
        {options.map(option => (
          <Radio
            key={option.value}
            id={`${name}-${option.value}`}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            label={option.label}
            disabled={option.disabled || disabled}
          />
        ))}
      </div>
    </fieldset>
  );
}