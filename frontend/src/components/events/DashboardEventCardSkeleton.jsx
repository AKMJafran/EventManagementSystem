import React from 'react';

export default function DashboardEventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-outline-variant/15 bg-white shadow-sm animate-pulse">
      <div className="aspect-[16/9] bg-surface-container-high" />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="h-4 w-40 rounded-full bg-surface-container-high" />
            <div className="h-3 w-28 rounded-full bg-surface-container-high" />
          </div>
          <div className="h-6 w-20 rounded-full bg-surface-container-high" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-3/4 rounded-full bg-surface-container-high" />
          <div className="h-3 w-1/2 rounded-full bg-surface-container-high" />
        </div>
      </div>
    </div>
  );
}
