/**
 * SLOTI brand symbol — organic isometric cube made of three blob-cell faces,
 * representing "o encaixe das diversas ferramentas em um único sistema".
 * Top face: turquesa #2FC9AF · Left face: roxo #6024B4 · Right face: azul-escuro #0B0073
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
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b" />
          <feColorMatrix
            in="b"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 14 -7"
            result="g"
          />
          <feComposite in="SourceGraphic" in2="g" operator="atop" />
        </filter>
      </defs>

      {/* Right face — azul-escuro */}
      <g filter="url(#sloti-blob)" fill="#0B0073">
        <ellipse cx="42" cy="34" rx="11" ry="7" transform="rotate(60 42 34)" />
        <ellipse cx="44" cy="44" rx="9" ry="6" transform="rotate(60 44 44)" />
        <ellipse cx="38" cy="50" rx="8" ry="5" transform="rotate(60 38 50)" />
      </g>

      {/* Left face — roxo */}
      <g filter="url(#sloti-blob)" fill="#6024B4">
        <ellipse cx="22" cy="34" rx="11" ry="7" transform="rotate(-60 22 34)" />
        <ellipse cx="20" cy="44" rx="9" ry="6" transform="rotate(-60 20 44)" />
        <ellipse cx="26" cy="50" rx="8" ry="5" transform="rotate(-60 26 50)" />
      </g>

      {/* Top face — turquesa */}
      <g filter="url(#sloti-blob)" fill="#2FC9AF">
        <ellipse cx="32" cy="22" rx="12" ry="7" />
        <ellipse cx="24" cy="26" rx="8" ry="5" />
        <ellipse cx="40" cy="26" rx="8" ry="5" />
        <ellipse cx="32" cy="32" rx="9" ry="5" />
      </g>
    </svg>
  );
}
