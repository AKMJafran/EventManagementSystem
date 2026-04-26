import React from 'react';
import { Link } from 'react-router-dom';
import ProfileAvatar from '../ProfileAvatar';
import { getPortalLabel, getProfileRoute } from '../../utils/profileRoutes';

export default function ProfileShortcut({ user, className = '' }) {
  return (
    <Link
      to={getProfileRoute(user?.role)}
      className={[
        'group flex items-center gap-3 rounded-2xl border border-outline-variant/30 bg-white/80 px-3 py-2 shadow-sm transition hover:border-primary/25 hover:bg-white',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Open profile settings"
      title="Open profile settings"
    >
      <div className="text-right">
        <p className="text-xs font-bold leading-none text-on-surface">{user?.name || 'User'}</p>
        <p className="text-[10px] text-on-surface-variant">{getPortalLabel(user?.role)}</p>
      </div>
      <ProfileAvatar
        src={user?.profilePictureUrl}
        name={user?.name}
        className="transition group-hover:ring-primary/20"
      />
    </Link>
  );
}
