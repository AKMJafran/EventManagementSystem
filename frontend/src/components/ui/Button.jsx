import React from "react";

export const Button = React.forwardRef(
  ({ className, variant = "primary", size = "default", children, isLoading, ...props }, ref) => {
    const baseStyle =
      "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none";

    const variants = {
      primary: "bg-primary text-white shadow-sm hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/15",
      secondary: "bg-secondary text-white shadow-sm hover:bg-secondary/90 hover:shadow-lg hover:shadow-secondary/15",
      outline: "border border-outline-variant/60 bg-white text-on-surface hover:bg-surface-container-low hover:shadow-md",
      ghost: "bg-transparent text-on-surface hover:bg-surface-container-low",
      danger: "bg-error text-white shadow-sm hover:bg-error/90 hover:shadow-lg hover:shadow-error/10",
      success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/15",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3",
      lg: "h-11 px-8",
      icon: "h-10 w-10",
    };

    const classes = `${baseStyle} ${variants[variant]} ${sizes[size]} ${className || ""}`;

    return (
      <button ref={ref} className={classes} disabled={isLoading || props.disabled} {...props}>
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
