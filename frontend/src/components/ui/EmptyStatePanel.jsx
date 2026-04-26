import React from 'react';

export default function EmptyStatePanel({
  icon = 'inbox',
  title,
  message,
}) {
  return (
    <div className="rounded-[1.75rem] border border-outline-variant/15 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low text-primary">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <h3 className="mt-5 text-xl font-bold text-on-surface">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">{message}</p>
    </div>
  );
}
