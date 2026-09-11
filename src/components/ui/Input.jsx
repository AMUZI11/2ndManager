import React from 'react';

export const Input = React.forwardRef(({
  label,
  helperText,
  errorText,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || React.useId();
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-lg font-bold text-kw-text">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-describedby={`${helperText ? helperId : ''} ${errorText ? errorId : ''}`.trim()}
        aria-invalid={!!errorText}
        className={`
          h-16 px-6 rounded-xl border-2 bg-kw-bg text-xl font-medium text-kw-text
          transition-colors outline-none
          placeholder:text-gray-500
          ${errorText 
            ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' 
            : 'border-kw-border focus:border-kw-border focus:ring-1 focus:ring-[#C5A059]'
          }
          disabled:opacity-50 disabled:bg-kw-card disabled:cursor-not-allowed
        `}
        {...props}
      />
      {(helperText || errorText) && (
        <div className="flex flex-col gap-1">
          {errorText && (
            <span id={errorId} className="text-base text-rose-500 font-bold">
              {errorText}
            </span>
          )}
          {helperText && !errorText && (
            <span id={helperId} className="text-base text-gray-400">
              {helperText}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';
