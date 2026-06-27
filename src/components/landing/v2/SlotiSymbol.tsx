/**
 * SLOTI brand symbol — globo orgânico em três faces coloridas.
 * Top arc: turquesa #14D9B4 · Bottom-left: roxo #7B2FBE · Bottom-right: navy #0B0073
 */
interface SlotiSymbolProps {
  size?: number;
  className?: string;
  title?: string;
}

export function SlotiSymbol({ size = 28, className = '', title = 'Sloti' }: SlotiSymbolProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      <defs>
        <filter id="sloti-blob" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b" />
          <feColorMatrix
            in="b"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
            result="g"
          />
          <feComposite in="SourceGraphic" in2="g" operator="atop" />
        </filter>
      </defs>

      {/* Top arc — turquesa */}
      <g filter="url(#sloti-blob)" fill="#14D9B4">
        <ellipse cx="32" cy="14" rx="16" ry="8" />
        <ellipse cx="32" cy="22" rx="18" ry="7" />
        <ellipse cx="32" cy="29" rx="14" ry="6" />
        <ellipse cx="32" cy="34" rx="9"  ry="4" />
      </g>

      {/* Bottom-left — roxo */}
      <g filter="url(#sloti-blob)" fill="#7B2FBE">
        <ellipse cx="20" cy="36" rx="12" ry="6" transform="rotate(-55 20 36)" />
        <ellipse cx="15" cy="46" rx="11" ry="6" transform="rotate(-55 15 46)" />
        <ellipse cx="25" cy="52" rx="9"  ry="5" transform="rotate(-55 25 52)" />
      </g>

      {/* Bottom-right — navy */}
      <g filter="url(#sloti-blob)" fill="#0B0073">
        <ellipse cx="44" cy="36" rx="12" ry="6" transform="rotate(55 44 36)" />
        <ellipse cx="49" cy="46" rx="11" ry="6" transform="rotate(55 49 46)" />
        <ellipse cx="39" cy="52" rx="9"  ry="5" transform="rotate(55 39 52)" />
      </g>
    </svg>
  );
}
