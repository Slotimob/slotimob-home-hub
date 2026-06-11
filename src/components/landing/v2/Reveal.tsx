import { ReactNode, CSSProperties } from 'react';
import { useReveal } from './useReveal';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  as?: 'div' | 'span' | 'li' | 'p' | 'h1' | 'h2' | 'h3';
  className?: string;
  y?: number;
  style?: CSSProperties;
}

export function Reveal({ children, delay = 0, as: Tag = 'div', className = '', y = 16, style }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <Tag
      ref={ref as any}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity .8s cubic-bezier(.22,.61,.36,1) ${delay}ms, transform .8s cubic-bezier(.22,.61,.36,1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
