'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { withBasePath } from '@/lib/base-path';

type Props = {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  sizes?: string;
};

function isLocalAsset(src: string) {
  return src.startsWith('/assets/') || src.startsWith('/assets');
}

/** Prefer next/image for local assets; fall back to img for data/external quirks. */
export default function SmartImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  style,
  priority,
  sizes,
}: Props) {
  if (!src) return null;
  const resolved = withBasePath(src);
  if (!isLocalAsset(src) && !src.startsWith('/')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} style={style} loading={priority ? 'eager' : 'lazy'} />;
  }

  if (fill) {
    return (
      <Image
        src={resolved}
        alt={alt}
        fill
        className={className}
        style={style}
        priority={priority}
        sizes={sizes || '100vw'}
      />
    );
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      width={width || 1200}
      height={height || 800}
      className={className}
      style={style}
      priority={priority}
      sizes={sizes}
    />
  );
}
