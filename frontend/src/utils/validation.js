export const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;
export const STUDENT_ID_PATTERN = /^[A-Za-z0-9/-]{4,20}$/;
export const STAFF_ID_PATTERN = /^[A-Za-z0-9/-]{3,20}$/;
export const PHONE_PATTERN = /^\+?\d{7,15}$/;

function normalize(value) {
  return String(value ?? '').trim().replace(/\s{2,}/g, ' ');
}

export function validateRequiredText(value, label, options = {}) {
  const {
    min = 1,
    max = null,
    pattern = null,
    patternMessage = `${label} contains invalid characters.`,
  } = options;

  const normalized = normalize(value);
  if (!normalized) {
    return `${label} is required.`;
  }
  if (normalized.length < min) {
    return `${label} must be at least ${min} characters.`;
  }
  if (max != null && normalized.length > max) {
    return `${label} cannot exceed ${max} characters.`;
  }
  if (pattern && !pattern.test(normalized)) {
    return patternMessage;
  }
  return '';
}

export function validateName(value, label = 'Name') {
  return validateRequiredText(value, label, {
    min: 2,
    max: 120,
    pattern: NAME_PATTERN,
    patternMessage: `${label} can only include letters, spaces, periods, apostrophes, and hyphens.`,
  });
}

export function validateEmail(value, label = 'Email') {
  const normalized = normalize(value).toLowerCase();
  if (!normalized) {
    return `${label} is required.`;
  }
  if (!/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(normalized)) {
    return `Enter a valid ${label.toLowerCase()}.`;
  }
  return '';
}

export function validatePhone(value, label = 'Contact number') {
  const normalized = normalize(value);
  if (!normalized) {
    return `${label} is required.`;
  }
  if (!PHONE_PATTERN.test(normalized)) {
    return `${label} must contain 7 to 15 digits and may start with +.`;
  }
  return '';
}

export function validateStudentId(value, label = 'Student ID') {
  return validateRequiredText(value, label, {
    min: 4,
    max: 20,
    pattern: STUDENT_ID_PATTERN,
    patternMessage: `${label} must contain only letters, numbers, slashes, or hyphens.`,
  });
}

export function validateStaffId(value, label = 'Lecturer ID') {
  return validateRequiredText(value, label, {
    min: 3,
    max: 20,
    pattern: STAFF_ID_PATTERN,
    patternMessage: `${label} must contain only letters, numbers, slashes, or hyphens.`,
  });
}

export function validatePositiveInteger(value, label, options = {}) {
  const { min = 1, max = null } = options;
  const raw = String(value ?? '').trim();
  if (!raw) {
    return `${label} is required.`;
  }
  if (!/^\d+$/.test(raw)) {
    return `${label} must be a whole number.`;
  }
  const parsed = Number(raw);
  if (parsed < min) {
    return `${label} must be at least ${min}.`;
  }
  if (max != null && parsed > max) {
    return `${label} cannot exceed ${max}.`;
  }
  return '';
}

export function validateBatchYear(value) {
  return validatePositiveInteger(value, 'Batch year', { min: 2000, max: 2100 });
}

export function validateDepartment(value, allowedDepartments = ['ICT', 'ET', 'BST']) {
  const normalized = normalize(value).toUpperCase();
  if (!normalized) {
    return 'Department is required.';
  }
  if (!allowedDepartments.includes(normalized)) {
    return `Department must be one of ${allowedDepartments.join(', ')}.`;
  }
  return '';
}

export function validateReason(value, label = 'Reason', min = 5) {
  return validateRequiredText(value, label, {
    min,
    max: 500,
  });
}

export function validateCategoryName(value, label = 'Category name') {
  return validateRequiredText(value, label, {
    min: 2,
    max: 80,
  });
}

export function validateVenueName(value) {
  return validateRequiredText(value, 'Venue name', {
    min: 2,
    max: 120,
  });
}

export function validateLocation(value) {
  return validateRequiredText(value, 'Location', {
    min: 2,
    max: 160,
  });
}

export function normalizeFieldValue(value) {
  return normalize(value);
}
