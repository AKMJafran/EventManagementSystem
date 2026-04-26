import { resolveAssetUrl } from './assetUrl';

function normalizeEventRecord(event = {}) {
  const imageUrl =
    event.imageUrl ||
    event.image_path ||
    event.imagePath ||
    event.bannerUrl ||
    event.image;

  return {
    ...event,
    imageUrl: resolveAssetUrl(imageUrl) || null,
  };
}

export function normalizeEventCollection(payload) {
  const source = Array.isArray(payload?.content)
    ? payload.content
    : Array.isArray(payload)
      ? payload
      : [];

  return source.map((event) => normalizeEventRecord(event));
}
