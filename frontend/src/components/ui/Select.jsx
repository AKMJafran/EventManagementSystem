import React from "react";

export const Select = React.forwardRef(
  ({ className, error, label, helperText, id, options = [], placeholder, wrapperClass, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id ?? generatedId;

    return (
      <div className={`space-y-1.5 ${wrapperClass || ""}`}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50 appearance-none
              ${
                error
                  ? "border-red-500 text-red-900 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-primary-500"
              }
              ${className || ""}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-gray-400">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label || opt.value}
              </option>
            ))}
            {props.children}
          </select>
          {/* Custom chevron dropdown icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
             <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
             </svg>
          </div>
        </div>
        {(error || helperText) && (
          <p className={`text-sm ${error ? "text-red-500 font-medium" : "text-gray-500"}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";