import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface HalftoneSpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

const SIZE_CLASS: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-16 h-16',
};

// Pre-computed positions for 8 dots equally spaced on a 24-unit viewBox circle (r=8).
// Opacity decreases counter to rotation direction, producing a comic-style halftone trail.
const DOTS: ReadonlyArray<{ cx: number; cy: number; opacity: number }> = [
  { cx: 12, cy: 4, opacity: 1.0 },
  { cx: 17.66, cy: 6.34, opacity: 0.82 },
  { cx: 20, cy: 12, opacity: 0.66 },
  { cx: 17.66, cy: 17.66, opacity: 0.52 },
  { cx: 12, cy: 20, opacity: 0.4 },
  { cx: 6.34, cy: 17.66, opacity: 0.3 },
  { cx: 4, cy: 12, opacity: 0.22 },
  { cx: 6.34, cy: 6.34, opacity: 0.14 },
];

const HalftoneSpinner: React.FC<HalftoneSpinnerProps> = ({
  size = 'md',
  className = '',
  label,
}) => {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-block ${SIZE_CLASS[size]} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-full h-full animate-spin"
        style={{ animationDuration: '900ms' }}
      >
        {DOTS.map((d, i) => (
          <circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r={2.4}
            fill="currentColor"
            opacity={d.opacity}
          />
        ))}
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
};

export default HalftoneSpinner;
