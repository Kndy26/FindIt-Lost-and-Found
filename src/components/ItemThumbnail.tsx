import { useState } from 'react';
import { PackageSearch } from 'lucide-react';

interface ItemThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function ItemThumbnail({ src, alt, className = '' }: ItemThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-400 select-none ${className}`}
      >
        <PackageSearch className="w-7 h-7 stroke-[1.5]" />
        <span className="mt-1.5 text-[11px] font-medium text-slate-500">Tanpa Foto</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
