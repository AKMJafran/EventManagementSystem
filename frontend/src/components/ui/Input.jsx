import React from "react";

export const Input = React.forwardRef(
  ({ className, error, label, helperText, id, wrapperClass, ...props }, ref) => {
    const inputId = id || Math.random().toString(36).substring(7);

    return (
      <div className={`space-y-1.5 ${wrapperClass || ""}`}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            className={`flex h-10 w-full rounded-md border text-sm place-holder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50 px-3 py-2 transition-colors
              ${
                error
                  ? "border-red-500 text-red-900 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-primary-500 text-gray-900 shadow-sm"
              }
              ${className || ""}`}
            {...props}
          />
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

Input.displayName = "Input";
