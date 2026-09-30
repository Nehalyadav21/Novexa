'use client';

import { COLORS, STAR_COORDS } from '@/lib/theme';
import Image from 'next/image';

export function NovexaLogo({ size = 80 }) {
  // Convert size prop to numeric value
  const getSize = (sizeValue) => {
    if (typeof sizeValue === 'number') return sizeValue;
    switch (sizeValue) {
      case 'sm': return 40;
      case 'md': return 80;
      case 'lg': return 120;
      default: return 80;
    }
  };

  const logoSize = getSize(size);

  return (
    <div className="flex flex-col items-center gap-2">
      <Image
        src="/novexa2.png"
        alt="Novexa Logo"
        width={logoSize}
        height={logoSize}
        className="object-contain"
        priority
      />
      <div className="text-4xl md:text-5xl font-extrabold tracking-tight">
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary}, ${COLORS.violet})`,
            textShadow: `0 0 32px ${COLORS.accent}88`,
          }}
        >
          Novexa
        </span>
      </div>
    </div>
  );
}

export function Particles() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0">
        {STAR_COORDS.map((c, i) => (
          <span
            key={i}
            className="absolute h-[3px] w-[3px] rounded-full animate-twinkle"
            style={{
              top: c.top,
              left: c.left,
              backgroundColor: '#ffffff',
              boxShadow: `0 0 8px ${COLORS.accent}, 0 0 12px ${COLORS.secondary}`,
              opacity: c.o,
              animationDelay: `${i * 0.13}s`,
              animationDuration: `${3 + (i % 5)}s`,
            }}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="absolute -top-20 -left-20 h-96 w-96 rounded-full blur-3xl opacity-40 animate-float-y"
        style={{
          background: `radial-gradient(closest-side, ${COLORS.accent}66, transparent)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-40 animate-float-x"
        style={{
          background: `radial-gradient(closest-side, ${COLORS.violet}55, transparent)`,
        }}
      />
    </div>
  );
}

export function Field({ label, htmlFor, children, ...props }) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium tracking-wide text-gray-300"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
