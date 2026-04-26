export function normalizeEventCollection(payload) {
  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
}
