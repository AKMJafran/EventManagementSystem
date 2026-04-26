export function getProfileRoute(role) {
  if (role === 'ADMIN') return '/admin/profile';
  if (role === 'LECTURER') return '/lecturer/profile';
  return '/student/profile';
}

export function getPortalLabel(role) {
  if (role === 'ADMIN') return 'Admin Portal';
  if (role === 'LECTURER') return 'Lecturer Portal';
  return 'Student Portal';
}

export function getWorkspaceLabel(role) {
  if (role === 'ADMIN') return 'Admin Workspace';
  if (role === 'LECTURER') return 'Lecturer Workspace';
  return 'Student Workspace';
}
