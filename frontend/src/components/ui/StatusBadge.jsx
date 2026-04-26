import React from 'react';

export default function StatusBadge({ status }) {
  const getStatusConfig = (s) => {
    switch (s) {
      case 'ACTIVE':
        return { color: 'bg-emerald-100 text-emerald-700', label: 'Active' };
      case 'PENDING_DEAN':
        return { color: 'bg-amber-100 text-amber-700', label: 'Pending Dean' };
      case 'PENDING_TREASURER':
        return { color: 'bg-orange-100 text-orange-700', label: 'Pending Treasurer' };
      case 'REJECTED':
        return { color: 'bg-rose-100 text-rose-700', label: 'Rejected' };
      case 'INACTIVE':
        return { color: 'bg-slate-100 text-slate-700', label: 'Inactive' };
      default:
        return { color: 'bg-slate-100 text-slate-700', label: s || 'Unknown' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
      {config.label}
    </span>
  );
}
