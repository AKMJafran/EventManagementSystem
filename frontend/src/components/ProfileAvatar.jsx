import React, { useEffect, useState } from 'react';
import { getInitials, resolveAssetUrl } from '../utils/assetUrl';

export default function ProfileAvatar({
  src,
  name,
  alt,
  sizeClassName = 'h-10 w-10',
  className = '',
  imageClassName = 'h-full w-full object-cover',
  initialsFallback = '?',
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const resolvedSrc = !hasError ? resolveAssetUrl(src) : null;
  const initials = getInitials(name, initialsFallback);

  return (
    <div
      className={[
        'flex items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary shadow-sm ring-1 ring-primary/10',
        sizeClassName,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={alt || `${name || 'User'} avatar`}
          className={imageClassName}
          loading="lazy"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="text-sm">{initials}</span>
      )}
    </div>
  );
}
