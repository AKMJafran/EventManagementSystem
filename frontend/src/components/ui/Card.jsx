import React from "react";

export function Card({ className, children, ...props }) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={`p-6 border-b border-gray-100 ${className || ""}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={`text-xl font-semibold leading-tight text-gray-900 ${className || ""}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={`text-sm text-gray-500 mt-1.5 ${className || ""}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={`p-6 ${className || ""}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={`p-6 flex items-center bg-gray-50/50 border-t border-gray-100 ${className || ""}`} {...props}>
      {children}
    </div>
  );
}
