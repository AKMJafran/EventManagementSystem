import React from 'react';

export default function ClubTypeTag({ type }) {
  const getTypeConfig = (t) => {
    switch (t) {
      case 'ACADEMIC':
        return 'bg-blue-100 text-blue-700';
      case 'CULTURAL':
        return 'bg-purple-100 text-purple-700';
      case 'SPORTS':
        return 'bg-emerald-100 text-emerald-700';
      case 'TECHNICAL':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const colorClass = getTypeConfig(type);

  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
      {type}
    </span>
  );
}
