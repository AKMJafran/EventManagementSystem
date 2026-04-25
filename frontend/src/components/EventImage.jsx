import React, { useEffect, useState } from 'react';
import heroImage from '../assets/hero.png';

export default function EventImage({ src, alt, className = '', fallbackSrc = heroImage }) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setCurrentSrc(fallbackSrc)}
    />
  );
}
