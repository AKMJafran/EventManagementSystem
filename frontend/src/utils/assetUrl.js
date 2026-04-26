const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081').replace(/\/+$/, '');

export function resolveAssetUrl(value) {
  if (value == null) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  if (/^(https?:|data:|blob:)/i.test(raw)) {
    return raw;
  }

  const normalized = raw.replace(/\\/g, '/');

  if (normalized.startsWith('//')) {
    return `https:${normalized}`;
  }

  if (normalized.startsWith('/')) {
    return `${API_BASE_URL}${normalized}`;
  }

  if (
    normalized.startsWith('files/') ||
    normalized.startsWith('uploads/') ||
    normalized.startsWith('api/')
  ) {
    return `${API_BASE_URL}/${normalized}`;
  }

  return normalized;
}

export function getInitials(name, fallback = '?') {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return fallback;
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}
