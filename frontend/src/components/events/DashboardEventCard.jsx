import React from 'react';
import { Link } from 'react-router-dom';
import EventImage from '../EventImage';

function formatDateRange(event) {
  if (!event?.startTime) {
    return 'Date not available';
  }

  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : null;
  const startLabel = `${start.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (!end || Number.isNaN(end.getTime())) {
    return startLabel;
  }
  return `${startLabel} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function DashboardEventCard({
  event,
  to,
  badgeLabel,
  badgeClassName = 'bg-secondary-container text-on-secondary-container',
  supportingText = '',
}) {
  return (
    <Link
      to={to}
      className="group block overflow-hidden rounded-[1.75rem] border border-outline-variant/15 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-container-high">
        <EventImage src={event?.imageUrl} alt={event?.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-on-surface">{event?.title || 'Untitled Event'}</h3>
            {supportingText && <p className="mt-1 text-sm text-on-surface-variant">{supportingText}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${badgeClassName}`}>
            {badgeLabel}
          </span>
        </div>

        <div className="grid gap-2 text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>{formatDateRange(event)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">location_on</span>
            <span>{event?.venue || 'Venue not assigned'}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
