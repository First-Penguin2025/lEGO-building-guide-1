import React, { useState } from 'react';

interface LegoAlbumIconProps {
  className?: string;
  alt?: string;
}

export const LegoAlbumIcon: React.FC<LegoAlbumIconProps> = ({ className, alt = 'Lego Album Icon' }) => {
  const [imgSrc, setImgSrc] = useState('/favicon.png');

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    // If it's a 1x1 placeholder, fallback to the beautiful vector SVG
    if (img.naturalWidth === 1 && img.naturalHeight === 1) {
      setImgSrc('/favicon.svg');
    }
  };

  const handlePngError = () => {
    setImgSrc('/favicon.svg');
  };

  return (
    <img 
      src={imgSrc} 
      onLoad={handleImageLoad}
      onError={handlePngError}
      className={className} 
      alt={alt} 
      referrerPolicy="no-referrer"
    />
  );
};
