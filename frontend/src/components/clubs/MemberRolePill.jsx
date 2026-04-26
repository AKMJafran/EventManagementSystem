import React from 'react';
import { getRoleDisplayName, getRoleIcon } from '../../utils/clubRoles';

const ROLE_TONES = {
  PRESIDENT: 'bg-amber-100 text-amber-800 border border-amber-200',
  VICE_PRESIDENT: 'bg-sky-100 text-sky-800 border border-sky-200',
  SECRETARY: 'bg-blue-100 text-blue-800 border border-blue-200',
  TREASURER: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  EDITOR: 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200',
  EVENT_COORDINATOR: 'bg-rose-100 text-rose-800 border border-rose-200',
  SPORTS_COORDINATOR: 'bg-lime-100 text-lime-800 border border-lime-200',
  TECHNICAL_COORDINATOR: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
  ACADEMIC_COORDINATOR: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  MEDIA_COORDINATOR: 'bg-violet-100 text-violet-800 border border-violet-200',
  GENERAL_MEMBER: 'bg-slate-100 text-slate-700 border border-slate-200',
};

export default function MemberRolePill({ role, displayName, compact = false }) {
  const tone = ROLE_TONES[role] || ROLE_TONES.GENERAL_MEMBER;
  const label = getRoleDisplayName(role, displayName);
  const icon = getRoleIcon(role);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${tone} ${
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
