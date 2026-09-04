import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
  priority?: boolean;
}

export function BrandLogo({
  className,
  width = 112,
  height = 56,
  alt = 'Las Vaqueras',
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/logo-vaqueras.png"
      alt={alt}
      width={width}
      height={height}
      className={cn('object-contain', className, 'w-auto')}
      priority={priority}
    />
  );
}
