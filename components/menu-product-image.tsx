'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

type MenuProductImageProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
};

export function MenuProductImage({ src, alt, sizes, className }: MenuProductImageProps) {
  if (!src) {
    return (
      <div
        className={cn('absolute inset-0 bg-neutral-800', className)}
        aria-hidden
        title={alt}
      />
    );
  }

  return (
    <Image src={src} alt={alt} fill className={cn('object-cover', className)} sizes={sizes} />
  );
}
