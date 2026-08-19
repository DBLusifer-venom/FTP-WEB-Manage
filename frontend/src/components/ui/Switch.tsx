import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../utils/helpers';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  labelClassName?: string;
  wrapperClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-8 h-5 after:w-4 after:h-4 after:translate-x-4',
  md: 'w-11 h-6 after:w-5 after:h-5 after:translate-x-5',
  lg: 'w-14 h-7 after:w-6 after:h-6 after:translate-x-6',
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ 
    className, 
    label, 
    labelClassName, 
    wrapperClassName, 
    size = 'md',
    disabled,
    id,
    ...props 
  }, ref) => {
    const switchId = id || `switch-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <label 
        className={cn(
          'switch-wrapper inline-flex items-center cursor-pointer select-none',
          wrapperClassName,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        htmlFor={switchId}
      >
        <input
          ref={ref}
          type="checkbox"
          id={switchId}
          className={cn(
            'switch-input peer appearance-none rounded-full bg-gray-300 checked:bg-primary-600',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'after:content-[""] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:shadow-lg after:transition-transform after:duration-200',
            sizeClasses[size],
            className
          )}
          disabled={disabled}
          {...props}
        />
        {label && (
          <span 
            className={cn(
              'switch-label ml-3 text-sm text-gray-700 cursor-pointer select-none',
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

Switch.displayName = 'Switch';