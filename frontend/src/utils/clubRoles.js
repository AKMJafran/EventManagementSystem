const COMMON_ROLES = [
  'PRESIDENT',
  'VICE_PRESIDENT',
  'SECRETARY',
  'TREASURER',
  'EDITOR',
  'GENERAL_MEMBER',
];

const TYPE_SPECIFIC_ROLES = {
  TECHNICAL: ['TECHNICAL_COORDINATOR', 'MEDIA_COORDINATOR', 'EVENT_COORDINATOR'],
  CULTURAL: ['EVENT_COORDINATOR', 'MEDIA_COORDINATOR'],
  SPORTS: ['EVENT_COORDINATOR', 'SPORTS_COORDINATOR'],
  ACADEMIC: ['ACADEMIC_COORDINATOR', 'TECHNICAL_COORDINATOR', 'EVENT_COORDINATOR'],
};

const DISPLAY_NAMES = {
  PRESIDENT: 'President',
  VICE_PRESIDENT: 'Vice President',
  SECRETARY: 'Secretary',
  TREASURER: 'Treasurer / Junior Treasurer',
  EDITOR: 'Editor',
  EVENT_COORDINATOR: 'Event Coordinator',
  SPORTS_COORDINATOR: 'Sports Coordinator',
  TECHNICAL_COORDINATOR: 'Technical Coordinator',
  ACADEMIC_COORDINATOR: 'Academic Coordinator',
  MEDIA_COORDINATOR: 'Media / Social Media Coordinator',
  GENERAL_MEMBER: 'General Member',
  SENIOR_TREASURER: 'Senior Treasurer',
};

const ROLE_ICONS = {
  PRESIDENT: '👑',
  VICE_PRESIDENT: '👔',
  SECRETARY: '📝',
  TREASURER: '💰',
  EDITOR: '✏️',
  EVENT_COORDINATOR: '🎯',
  SPORTS_COORDINATOR: '⚽',
  TECHNICAL_COORDINATOR: '💻',
  ACADEMIC_COORDINATOR: '📚',
  MEDIA_COORDINATOR: '📱',
  GENERAL_MEMBER: '👥',
  SENIOR_TREASURER: '🎓',
};

const ROLE_DESCRIPTIONS = {
  PRESIDENT: 'Leads the club and sets its direction.',
  VICE_PRESIDENT: 'Supports leadership and steps in when needed.',
  SECRETARY: 'Handles records, notices, and communication.',
  TREASURER: 'Manages funds and club finance records.',
  EDITOR: 'Shapes publications, reports, and written content.',
  EVENT_COORDINATOR: 'Plans and coordinates club events.',
  SPORTS_COORDINATOR: 'Organizes training, matches, and sports activities.',
  TECHNICAL_COORDINATOR: 'Leads technical work, tools, and operations.',
  ACADEMIC_COORDINATOR: 'Supports workshops, study sessions, and academics.',
  MEDIA_COORDINATOR: 'Manages social media, publicity, and media output.',
  GENERAL_MEMBER: 'Open membership for students who want to join.',
};

const ROLE_ORDER = [
  'PRESIDENT',
  'VICE_PRESIDENT',
  'SECRETARY',
  'TREASURER',
  'EDITOR',
  'ACADEMIC_COORDINATOR',
  'TECHNICAL_COORDINATOR',
  'EVENT_COORDINATOR',
  'SPORTS_COORDINATOR',
  'MEDIA_COORDINATOR',
  'GENERAL_MEMBER',
];

const ROLE_ORDER_INDEX = ROLE_ORDER.reduce((map, role, index) => {
  map[role] = index;
  return map;
}, {});

export function getRolesForClubType(clubType) {
  const specificRoles = TYPE_SPECIFIC_ROLES[clubType] || [];
  return [...COMMON_ROLES, ...specificRoles];
}

export function getRoleDisplayName(role, fallbackDisplayName) {
  return fallbackDisplayName || DISPLAY_NAMES[role] || role;
}

export function getRoleIcon(role) {
  return ROLE_ICONS[role] || '•';
}

export function getRoleDescription(role) {
  return ROLE_DESCRIPTIONS[role] || 'Club leadership and service role.';
}

export function sortByRoleOrder(items, getRole = (item) => item?.role) {
  return [...items].sort((left, right) => {
    const leftRole = getRole(left);
    const rightRole = getRole(right);
    return (ROLE_ORDER_INDEX[leftRole] ?? 999) - (ROLE_ORDER_INDEX[rightRole] ?? 999);
  });
}

export function getExecutiveCommitteeEntries(club) {
  return sortByRoleOrder(club?.executiveCommittee || []);
}

export function getGeneralMembers(members = []) {
  return members.filter((member) => member.memberRole === 'GENERAL_MEMBER');
}

export function getRoleRoster(club) {
  const roles = getRolesForClubType(club?.type).filter((role) => role !== 'GENERAL_MEMBER');
  const membersByRole = new Map(
    (club?.executiveCommittee || []).map((member) => [member.role, member])
  );

  return roles.map((role) => {
    const match = membersByRole.get(role);
    return {
      role,
      displayName: getRoleDisplayName(role, match?.displayName),
      memberName: match?.memberName || '',
      memberStudentNumber: match?.memberStudentNumber || '',
      filled: Boolean(match?.memberName),
    };
  });
}

export function getOpenRoleCount(club) {
  return getRoleRoster(club).filter((role) => !role.filled).length;
}
