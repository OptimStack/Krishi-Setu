import React from 'react';

const Input = React.forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#2A5124] dark:focus:ring-[#D3D67A] transition-colors ${
          error ? 'border-red-500' : 'border-stone-300 dark:border-emerald-900/60'
        } disabled:bg-stone-100 dark:disabled:bg-stone-900 disabled:text-stone-500`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
