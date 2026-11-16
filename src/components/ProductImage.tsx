import {
  Box,
  CircuitBoard,
  Cpu,
  Fan,
  HardDrive,
  MemoryStick,
  Monitor,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CATEGORY_LABELS } from '../data/partMedia';
import type { PartCategoryKey } from '../types/pc';

interface ProductImageProps {
  imageUrl?: string | null;
  category: PartCategoryKey;
  model: string;
  brand?: string;
  className?: string;
  compact?: boolean;
}

function CategoryPlaceholderIcon({
  category,
  className,
}: {
  category: PartCategoryKey;
  className: string;
}) {
  switch (category) {
    case 'cpu':
      return <Cpu className={className} />;
    case 'gpu':
      return <Monitor className={className} />;
    case 'motherboard':
      return <CircuitBoard className={className} />;
    case 'ram':
      return <MemoryStick className={className} />;
    case 'ssd':
      return <HardDrive className={className} />;
    case 'psu':
      return <Zap className={className} />;
    case 'pcCase':
      return <Box className={className} />;
    case 'cooler':
      return <Fan className={className} />;
  }
}

export function ProductImage({
  imageUrl,
  category,
  model,
  brand,
  className = 'h-full w-full object-cover object-center',
  compact = false,
}: ProductImageProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  const cleanUrl = imageUrl?.trim() ?? '';
  const hasRemoteOrValidUrl =
    cleanUrl.length > 0 &&
    (/^https?:\/\//i.test(cleanUrl) || cleanUrl.startsWith('/'));

  if (hasRemoteOrValidUrl && !imgFailed) {
    return (
      <img
        src={cleanUrl}
        alt={model}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={className}
      />
    );
  }

  if (compact) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#080B12] to-[#111827] text-[#246BFD]"
        aria-label={model}
      >
        <CategoryPlaceholderIcon category={category} className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#0D1422] via-[#080B12] to-[#111827] p-6 text-center"
      aria-label={model}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-800 bg-[#111827] text-[#246BFD]">
        <CategoryPlaceholderIcon category={category} className="h-7 w-7" />
      </div>
      <span className="mt-3 text-[11px] font-semibold tracking-wider text-[#FF7900]">
        {brand ? `${brand} · ` : ''}
        {CATEGORY_LABELS[category]}
      </span>
      <span className="mt-1 line-clamp-2 max-w-[260px] font-display text-sm font-bold text-[#F5F7FA]">
        {model}
      </span>
    </div>
  );
}
