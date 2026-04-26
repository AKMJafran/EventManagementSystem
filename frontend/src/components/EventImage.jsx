import React, { useState } from 'react';
import heroImage from '../assets/hero.png';

export default function EventImage({ src, alt, className = '', fallbackSrc = heroImage }) {
  const initialSrc = src || fallbackSrc;
  const [imgSrc, setImgSrc] = useState(initialSrc);

  return (
    <img
      src={src || imgSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setImgSrc(fallbackSrc)}
    />
  );
}
