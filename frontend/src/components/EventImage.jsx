import React, { useState } from 'react';
import { resolveAssetUrl } from '../utils/assetUrl';

export default function EventImage({ src, alt, className = '', fallbackSrc = null }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const resolvedSrc = resolveAssetUrl(src);
  const resolvedFallback = resolveAssetUrl(fallbackSrc);
  const primarySrc = resolvedSrc && failedSrc !== resolvedSrc ? resolvedSrc : null;
  const finalSrc = primarySrc || resolvedFallback;

  if (!finalSrc) {
    return (
      <div
        className={[
          'flex items-center justify-center bg-surface-container-high text-on-surface-variant',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={alt || 'No image available'}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="material-symbols-outlined text-2xl">image</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">No Image</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailedSrc(resolvedSrc)}
    />
  );
}
